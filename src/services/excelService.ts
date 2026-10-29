import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { DailyLog, LabMarkerDefinition, LabTest } from '../types';
import { StorageService } from './storageService';

export interface ExportFilterOptions {
  startDate?: string;
  endDate?: string;
  includeSymptoms: boolean;
  includeHairCare: boolean;
  includeMedications: boolean;
  includeCycle: boolean;
  includeLabTests: boolean;
  includeLabNorms: boolean;
}

export const ExcelService = {
  async generateAndShareExport(options: ExportFilterOptions): Promise<{ success: boolean; message?: string }> {
    try {
      const logsMap = await StorageService.getAllDailyLogs();
      const labMarkers = await StorageService.getLabMarkers();
      const labTests = await StorageService.getLabTests();

      let logs = Object.values(logsMap).sort((a, b) => a.date.localeCompare(b.date));

      // Filtre de dates
      if (options.startDate) {
        logs = logs.filter((l) => l.date >= options.startDate!);
      }
      if (options.endDate) {
        logs = logs.filter((l) => l.date <= options.endDate!);
      }

      const workbook = XLSX.utils.book_new();

      // 1. Feuille Suivi Général
      const dailyRows: any[] = [];
      logs.forEach((log) => {
        const row: Record<string, any> = {
          Date: log.date,
        };

        if (options.includeHairCare) {
          row['Perte de cheveux (nb)'] = log.hairLossAmount ?? 'Non renseigné';
          row['Lavage'] = log.hairWashDone ? 'Oui' : 'Non';
          row['Type de Shampoing'] = log.shampooType ? log.shampooType.replace('_', ' ') : '-';
          row['Coupe effectuée'] = log.haircutDone ? 'Oui' : 'Non';
          row['Notes Coupe'] = log.haircutNotes || '-';
          row['Pose de Henné'] = log.hennaDone ? 'Oui' : 'Non';
        }

        if (options.includeSymptoms) {
          row['Anxiété (sur 10)'] = log.anxietyScore ?? 'Non noté';
          row['Boule dans la gorge'] = log.lumpInThroat ? 'Oui' : 'Non';
          row['Grosse dispute'] = log.conflictWithHusband ? 'Oui' : 'Non';
          row['Description dispute'] = log.conflictNote || '-';
        }

        if (options.includeMedications) {
          const takenMeds = log.medications
            .filter((m) => m.taken)
            .map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`)
            .join(', ');
          row['Compléments pris'] = takenMeds || 'Aucun';
        }

        if (options.includeCycle) {
          row['Règles (flux /10)'] = log.menstrualFlow ?? '-';
          row['Douleur règles'] = log.menstrualFlow != null ? (log.menstrualPain ? 'Présente' : 'Absente') : '-';
          row['Note règles'] = log.menstrualNote || '-';
          row['Fin des règles (heure)'] = log.menstrualEndedAt ?? '-';
        }

        dailyRows.push(row);
      });

      if (dailyRows.length > 0) {
        const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
        XLSX.utils.book_append_sheet(workbook, wsDaily, 'Journal Quotidien');
      }

      // 2. Feuille Compléments Détaillés
      if (options.includeMedications) {
        const medRows: any[] = [];
        logs.forEach((log) => {
          log.medications.forEach((m) => {
            medRows.push({
              Date: log.date,
              Médicament: m.name,
              Pris: m.taken ? 'Oui' : 'Non',
              Dosage: m.dosage || '-',
            });
          });
        });
        if (medRows.length > 0) {
          const wsMeds = XLSX.utils.json_to_sheet(medRows);
          XLSX.utils.book_append_sheet(workbook, wsMeds, 'Détail Compléments');
        }
      }

      // 3. Feuille Bilans Sanguins
      if (options.includeLabTests && labTests.length > 0) {
        const testRows: any[] = [];
        const markerMap = new Map(labMarkers.map((m) => [m.id, m]));

        labTests.forEach((test) => {
          Object.entries(test.values).forEach(([markerId, val]) => {
            const marker = markerMap.get(markerId);
            const markerName = marker ? marker.name : markerId;
            const unit = marker ? marker.unit : '';
            const min = marker?.minFunctional;
            const max = marker?.maxFunctional;

            let status = 'Non évalué';
            if (min !== undefined && max !== undefined) {
              if (val < min) status = 'En dessous (Bas)';
              else if (val > max) status = 'Au dessus (Élevé)';
              else status = 'Optimal';
            }

            testRows.push({
              'Date Prise de Sang': test.date,
              'Marqueur Sanguin': markerName,
              'Valeur Mesurée': val,
              'Unité': unit,
              'Norme Fonctionnelle Min': min ?? '-',
              'Norme Fonctionnelle Max': max ?? '-',
              'Statut': status,
              'Remarques': test.notes || '-',
            });
          });
        });

        if (testRows.length > 0) {
          const wsTests = XLSX.utils.json_to_sheet(testRows);
          XLSX.utils.book_append_sheet(workbook, wsTests, 'Bilans Sanguins');
        }
      }

      // 4. Feuille Normes Fonctionnelles de Référence
      if (options.includeLabNorms) {
        const normRows = labMarkers.map((m) => ({
          'Molécule / Analyse': m.name,
          'Seuil Min Optimal': m.minFunctional,
          'Seuil Max Optimal': m.maxFunctional,
          'Unité': m.unit,
          'Objectif Capillaire': m.description,
        }));
        const wsNorms = XLSX.utils.json_to_sheet(normRows);
        XLSX.utils.book_append_sheet(workbook, wsNorms, 'Normes Fonctionnelles');
      }

      // Génération binaire base64
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Export_Sante_Cheveux_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Partage natif
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exporter mes données Santé & Cheveux',
          UTI: 'com.microsoft.excel.xlsx',
        });
        return { success: true };
      } else {
        return { success: false, message: 'Le partage de fichiers n’est pas disponible sur cet appareil.' };
      }
    } catch (err: any) {
      console.error('Erreur export Excel:', err);
      return { success: false, message: err.message || 'Erreur lors de la création de l’export Excel' };
    }
  },
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  Syringe,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Save,
  X,
  FileText,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { LabMarkerDefinition, LabTest } from '../types';
import { StorageService } from '../services/storageService';

export default function NormsScreen() {
  const [activeTab, setActiveTab] = useState<'norms' | 'tests'>('norms');
  const [markers, setMarkers] = useState<LabMarkerDefinition[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Ajout/Modification de Norme
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerName, setMarkerName] = useState('');
  const [markerMin, setMarkerMin] = useState('');
  const [markerMax, setMarkerMax] = useState('');
  const [markerUnit, setMarkerUnit] = useState('');
  const [markerDesc, setMarkerDesc] = useState('');

  // Modal Saisie de Prise de Sang
  const [showTestModal, setShowTestModal] = useState(false);
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [testNotes, setTestNotes] = useState('');
  const [testValues, setTestValues] = useState<Record<string, string>>({});

  const colors = Colors.light;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const ms = await StorageService.getLabMarkers();
      const ts = await StorageService.getLabTests();
      setMarkers(ms);
      setLabTests(ts);
    } catch (e) {
      console.error('Erreur chargement normes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Ouvrir modal de modification de norme
  const handleEditMarker = (marker: LabMarkerDefinition) => {
    setEditingMarkerId(marker.id);
    setMarkerName(marker.name);
    setMarkerMin(String(marker.minFunctional));
    setMarkerMax(String(marker.maxFunctional));
    setMarkerUnit(marker.unit);
    setMarkerDesc(marker.description || '');
    setShowMarkerModal(true);
  };

  const handleOpenAddMarker = () => {
    setEditingMarkerId(null);
    setMarkerName('');
    setMarkerMin('');
    setMarkerMax('');
    setMarkerUnit('µg/L');
    setMarkerDesc('');
    setShowMarkerModal(true);
  };

  const handleSaveMarker = async () => {
    if (!markerName.trim() || !markerMin || !markerMax || !markerUnit.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le nom, min, max et unité.');
      return;
    }
    const minVal = parseFloat(markerMin.replace(',', '.'));
    const maxVal = parseFloat(markerMax.replace(',', '.'));
    if (isNaN(minVal) || isNaN(maxVal)) {
      Alert.alert('Valeurs invalides', 'Min et Max doivent être des nombres.');
      return;
    }

    const newMarker: LabMarkerDefinition = {
      id: editingMarkerId || `marker-${Date.now()}`,
      code: markerName.toLowerCase().replace(/\s+/g, '_'),
      name: markerName.trim(),
      minFunctional: minVal,
      maxFunctional: maxVal,
      unit: markerUnit.trim(),
      description: markerDesc.trim(),
      displayOrder: markers.length + 1,
    };

    const updated = await StorageService.saveLabMarker(newMarker);
    setMarkers(updated);
    setShowMarkerModal(false);
  };

  // Enregistrer une prise de sang
  const handleOpenAddTest = () => {
    setTestDate(new Date().toISOString().slice(0, 10));
    setTestNotes('');
    setTestValues({});
    setShowTestModal(true);
  };

  const handleSaveTest = async () => {
    const numericValues: Record<string, number> = {};
    Object.entries(testValues).forEach(([markerId, valStr]) => {
      if (valStr.trim() !== '') {
        const parsed = parseFloat(valStr.replace(',', '.'));
        if (!isNaN(parsed)) {
          numericValues[markerId] = parsed;
        }
      }
    });

    if (Object.keys(numericValues).length === 0) {
      Alert.alert('Attention', 'Veuillez saisir au moins une valeur d’analyse.');
      return;
    }

    const test: LabTest = {
      id: `test-${Date.now()}`,
      date: testDate,
      notes: testNotes.trim(),
      values: numericValues,
    };

    const updated = await StorageService.saveLabTest(test);
    setLabTests(updated);
    setShowTestModal(false);
    Alert.alert('Succès', 'Bilan de prise de sang enregistré.');
  };

  const handleDeleteTest = async (id: string) => {
    Alert.alert('Confirmer', 'Supprimer ce bilan de prise de sang ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const updated = await StorageService.deleteLabTest(id);
          setLabTests(updated);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Contrôle segmenté des onglets */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('norms')}
          style={[styles.tabButton, activeTab === 'norms' && styles.tabButtonActive]}>
          <Syringe size={16} color={activeTab === 'norms' ? '#0F172A' : '#64748B'} />
          <Text style={[styles.tabButtonText, activeTab === 'norms' && styles.tabButtonTextActive]}>
            Normes Capillaires
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('tests')}
          style={[styles.tabButton, activeTab === 'tests' && styles.tabButtonActive]}>
          <FileText size={16} color={activeTab === 'tests' ? '#0F172A' : '#64748B'} />
          <Text style={[styles.tabButtonText, activeTab === 'tests' && styles.tabButtonTextActive]}>
            Mes Prises de Sang ({labTests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'norms' ? (
          /* VUE 1 : NORMES FONCTIONNELLES */
          <View>
            <View style={styles.introBox}>
              <Text style={styles.introTitle}>Normes fonctionnelles idéales pour les cheveux</Text>
              <Text style={styles.introText}>
                Ces seuils correspondent aux plages fonctionnelles optimales pour la régénération et la limitation de la chute (souvent plus exigeantes que les normes laboratoires standard).
              </Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleOpenAddMarker}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.addButtonText}>Ajouter une nouvelle analyse / molécule</Text>
            </TouchableOpacity>

            {markers.map((marker) => (
              <View key={marker.id} style={styles.normCard}>
                <View style={styles.normCardHeader}>
                  <View style={styles.normTitleContainer}>
                    <Text style={styles.normName}>{marker.name}</Text>
                    <View style={styles.rangeBadge}>
                      <Text style={styles.rangeBadgeText}>
                        Idéal : {marker.minFunctional} – {marker.maxFunctional} {marker.unit}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => handleEditMarker(marker)}>
                    <Edit2 size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>

                {marker.description ? (
                  <Text style={styles.normDesc}>{marker.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          /* VUE 2 : PRISES DE SANG ENREGISTRÉES */
          <View>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenAddTest}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.addButtonText}>Enregistrer une nouvelle prise de sang</Text>
            </TouchableOpacity>

            {labTests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Syringe size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Aucune prise de sang enregistrée</Text>
                <Text style={styles.emptySubtitle}>
                  Cliquez sur le bouton ci-dessus pour renseigner vos résultats (Ferritine, TSH, T3, T4, Anti-TPO, NFS...).
                </Text>
              </View>
            ) : (
              labTests.map((test) => {
                const markerMap = new Map(markers.map((m) => [m.id, m]));

                return (
                  <View key={test.id} style={styles.testCard}>
                    <View style={styles.testCardHeader}>
                      <View style={styles.testDateRow}>
                        <Calendar size={16} color={colors.primary} />
                        <Text style={styles.testDateText}>Bilan du {test.date}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteTest(test.id)}
                        style={styles.deleteBtn}>
                        <Trash2 size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    {test.notes ? (
                      <Text style={styles.testNotesText}>« {test.notes} »</Text>
                    ) : null}

                    <View style={styles.resultsGrid}>
                      {Object.entries(test.values).map(([markerId, val]) => {
                        const marker = markerMap.get(markerId);
                        const name = marker ? marker.name : markerId;
                        const unit = marker ? marker.unit : '';
                        const min = marker?.minFunctional;
                        const max = marker?.maxFunctional;

                        let isOptimal = true;
                        let statusText = 'Optimal';
                        let badgeBg = '#ECFDF5';
                        let badgeColor = '#065F46';

                        if (min !== undefined && max !== undefined) {
                          if (val < min) {
                            isOptimal = false;
                            statusText = `Trop bas (< ${min})`;
                            badgeBg = '#FEF2F2';
                            badgeColor = '#991B1B';
                          } else if (val > max) {
                            isOptimal = false;
                            statusText = `Trop haut (> ${max})`;
                            badgeBg = '#FFFBEB';
                            badgeColor = '#92400E';
                          }
                        }

                        return (
                          <View key={markerId} style={styles.resultItem}>
                            <View>
                              <Text style={styles.resultName}>{name}</Text>
                              <Text style={styles.resultValue}>
                                {val} {unit}
                              </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                              {isOptimal ? (
                                <CheckCircle2 size={12} color={badgeColor} />
                              ) : (
                                <AlertCircle size={12} color={badgeColor} />
                              )}
                              <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                                {statusText}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Ajout/Modif Norme */}
      <Modal visible={showMarkerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMarkerId ? 'Modifier la norme fonctionnelle' : 'Ajouter une analyse'}
              </Text>
              <TouchableOpacity onPress={() => setShowMarkerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Nom de la molécule / analyse :</Text>
              <TextInput
                style={styles.fieldInput}
                value={markerName}
                onChangeText={setMarkerName}
                placeholder="Ex: Ferritine, Zinc, TSH..."
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Quantité Mini :</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    value={markerMin}
                    onChangeText={setMarkerMin}
                    placeholder="Ex: 70"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Quantité Maxi :</Text>
                  <TextInput
                    style={styles.fieldInput}
                    keyboardType="numeric"
                    value={markerMax}
                    onChangeText={setMarkerMax}
                    placeholder="Ex: 120"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Unité de mesure :</Text>
              <TextInput
                style={styles.fieldInput}
                value={markerUnit}
                onChangeText={setMarkerUnit}
                placeholder="Ex: µg/L, mUI/L, pg/mL..."
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Objectif pour les cheveux (optionnel) :</Text>
              <TextInput
                style={[styles.fieldInput, { height: 60 }]}
                multiline
                value={markerDesc}
                onChangeText={setMarkerDesc}
                placeholder="Ex: Nécessaire > 70 pour la repousse..."
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveMarker}>
                <Save size={18} color="#FFF" />
                <Text style={styles.saveModalButtonText}>Sauvegarder la norme</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Saisie Prise de Sang */}
      <Modal visible={showTestModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saisir une prise de sang</Text>
              <TouchableOpacity onPress={() => setShowTestModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Date du prélèvement (AAAA-MM-JJ) :</Text>
              <TextInput
                style={styles.fieldInput}
                value={testDate}
                onChangeText={setTestDate}
                placeholder="2026-10-01"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Notes / Contexte :</Text>
              <TextInput
                style={styles.fieldInput}
                value={testNotes}
                onChangeText={setTestNotes}
                placeholder="Ex: Contrôle thyroïde et fer après 3 mois de cure"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Valeurs mesurées (laisser vide si non analysé) :
              </Text>

              {markers.map((m) => (
                <View key={m.id} style={styles.testInputRow}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.testInputName}>{m.name}</Text>
                    <Text style={styles.testInputTarget}>
                      Norme : {m.minFunctional}-{m.maxFunctional} {m.unit}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.testValueInput}
                    keyboardType="numeric"
                    placeholder={`Valeur (${m.unit})`}
                    placeholderTextColor={colors.textMuted}
                    value={testValues[m.id] || ''}
                    onChangeText={(val) => setTestValues((prev) => ({ ...prev, [m.id]: val }))}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveTest}>
                <Save size={18} color="#FFF" />
                <Text style={styles.saveModalButtonText}>Enregistrer le bilan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4E8DB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  introBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  introText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  normCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  normCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  normTitleContainer: {
    flex: 1,
  },
  normName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  rangeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  rangeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  normDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16,
  },
  editIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteBtn: {
    padding: 6,
  },
  testNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 12,
  },
  resultsGrid: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resultName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalForm: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  saveModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  saveModalButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  testInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  testInputName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  testInputTarget: {
    fontSize: 11,
    color: '#64748B',
  },
  testValueInput: {
    width: 110,
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlign: 'right',
  },
});

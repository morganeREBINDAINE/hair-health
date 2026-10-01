import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import {
  Sparkles,
  Scissors,
  Droplet,
  HeartCrack,
  Flame,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  Pill,
  Moon,
  AlertTriangle,
} from 'lucide-react-native';
import { DailyLog, DailyMedicationItem, FatigueLevel, MedicationDefinition, ShampooType } from '../types';
import { StorageService } from '../services/storageService';

interface DailyEntryFormProps {
  selectedDate: string;
  onSaved?: () => void;
}

const SHAMPOO_OPTIONS: { id: ShampooType; label: string }[] = [
  { id: 'bebe', label: 'Bébé' },
  { id: 'sans_sulfate', label: 'Sans sulfate' },
  { id: 'avec_sulfate', label: 'Avec sulfate' },
  { id: 'traitant', label: 'Traitant' },
];

const FATIGUE_OPTIONS: { id: FatigueLevel; label: string; color: string; bg: string }[] = [
  { id: 'normal', label: 'Normal', color: '#10B981', bg: '#ECFDF5' },
  { id: 'légère', label: 'Légère', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'modérée', label: 'Modérée', color: '#F97316', bg: '#FFF7ED' },
  { id: 'importante', label: 'Importante', color: '#EF4444', bg: '#FEF2F2' },
];

const SLEEP_QUICK: number[] = [5, 6, 7, 8, 9];

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ selectedDate, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [anxietyScore, setAnxietyScore] = useState<number | null>(null);
  const [lumpInThroat, setLumpInThroat] = useState(false);
  const [conflictWithHusband, setConflictWithHusband] = useState(false);

  const [hairLossAmount, setHairLossAmount] = useState<string>('');
  const [haircutDone, setHaircutDone] = useState(false);
  const [haircutNotes, setHaircutNotes] = useState('');
  const [hairWashDone, setHairWashDone] = useState(false);
  const [shampooType, setShampooType] = useState<ShampooType | null>(null);
  const [hennaDone, setHennaDone] = useState(false);

  const [sleepHours, setSleepHours] = useState<string>('');
  const [fatigueLevel, setFatigueLevel] = useState<FatigueLevel | null>(null);

  const [medDefinitions, setMedDefinitions] = useState<MedicationDefinition[]>([]);
  const [medications, setMedications] = useState<DailyMedicationItem[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [showAddMed, setShowAddMed] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    sleep: false,
    stress: false,
    hair: false,
    meds: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (expand: boolean) => {
    setExpandedSections({ sleep: expand, stress: expand, hair: expand, meds: expand });
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const defs = await StorageService.getMedications();
      setMedDefinitions(defs);

      const existingLog = await StorageService.getDailyLog(selectedDate);
      if (existingLog) {
        setAnxietyScore(existingLog.anxietyScore);
        setLumpInThroat(existingLog.lumpInThroat);
        setConflictWithHusband(existingLog.conflictWithHusband);
        setHairLossAmount(existingLog.hairLossAmount !== null ? String(existingLog.hairLossAmount) : '');
        setHaircutDone(existingLog.haircutDone);
        setHaircutNotes(existingLog.haircutNotes || '');
        setHairWashDone(existingLog.hairWashDone);
        setShampooType(existingLog.shampooType);
        setHennaDone(existingLog.hennaDone);
        setSleepHours(existingLog.sleepHours !== null && existingLog.sleepHours !== undefined ? String(existingLog.sleepHours) : '');
        setFatigueLevel(existingLog.fatigueLevel ?? null);

        const medMap = new Map(existingLog.medications.map((m) => [m.name, m]));
        const mergedMeds: DailyMedicationItem[] = defs.map((def) => {
          const found = medMap.get(def.name);
          return found ?? { name: def.name, taken: def.isPrechecked, dosage: def.defaultDosage };
        });
        setMedications(mergedMeds);
      } else {
        setAnxietyScore(null);
        setLumpInThroat(false);
        setConflictWithHusband(false);
        setHairLossAmount('');
        setHaircutDone(false);
        setHaircutNotes('');
        setHairWashDone(false);
        setShampooType(null);
        setHennaDone(false);
        setSleepHours('');
        setFatigueLevel(null);
        setMedications(defs.map((def) => ({ name: def.name, taken: def.isPrechecked, dosage: def.defaultDosage })));
      }
    } catch (e) {
      console.error('Erreur chargement journal:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMed = (index: number) => {
    setMedications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], taken: !next[index].taken };
      return next;
    });
  };

  const handleUpdateMedDosage = (index: number, dosage: string) => {
    setMedications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], dosage };
      return next;
    });
  };

  const handleAddNewMed = async () => {
    if (!newMedName.trim()) return;
    try {
      const updatedDefs = await StorageService.addMedication(newMedName, newMedDosage, false);
      setMedDefinitions(updatedDefs);
      setMedications((prev) => [...prev, { name: newMedName.trim(), dosage: newMedDosage.trim(), taken: true }]);
      setNewMedName('');
      setNewMedDosage('');
      setShowAddMed(false);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter le complément.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedHairLoss = hairLossAmount.trim() === '' ? null : parseInt(hairLossAmount, 10);
      const parsedSleep = sleepHours.trim() === '' ? null : parseFloat(sleepHours);

      const log: DailyLog = {
        date: selectedDate,
        anxietyScore,
        lumpInThroat,
        conflictWithHusband,
        hairLossAmount: isNaN(parsedHairLoss as number) ? null : parsedHairLoss,
        haircutDone,
        haircutNotes,
        hairWashDone,
        shampooType: hairWashDone ? shampooType : null,
        hennaDone,
        sleepHours: isNaN(parsedSleep as number) ? null : parsedSleep,
        fatigueLevel,
        medications,
      };

      await StorageService.saveDailyLog(log);
      Alert.alert('Enregistré ✓', `Journée du ${selectedDate} sauvegardée.`);
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
      Alert.alert('Erreur', 'Impossible de sauvegarder la saisie.');
    } finally {
      setSaving(false);
    }
  };

  const sleepSummary = sleepHours
    ? `${sleepHours}h${fatigueLevel ? ` · Fatigue ${fatigueLevel}` : ''}`
    : fatigueLevel
    ? `Fatigue ${fatigueLevel}`
    : 'Heures de sommeil, fatigue au réveil';

  const stressSummary =
    anxietyScore !== null
      ? `Anxiété: ${anxietyScore}/10${lumpInThroat ? ' · Gorge' : ''}${conflictWithHusband ? ' · Dispute' : ''}`
      : lumpInThroat || conflictWithHusband
      ? `${lumpInThroat ? 'Gorge serrée ' : ''}${conflictWithHusband ? 'Dispute' : ''}`
      : 'Anxiété, symptômes';

  const hairSummary = hairLossAmount
    ? `Perte: ~${hairLossAmount} ch.`
    : hairWashDone
    ? 'Shampoing fait'
    : hennaDone
    ? 'Soin henné'
    : haircutDone
    ? 'Coupe effectuée'
    : 'Chute, shampoing, coupe, henné';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Controls accordéon */}
      <View style={styles.accordionControlRow}>
        <Text style={styles.accordionHint}>Touchez un titre pour déplier</Text>
        <View style={styles.accordionActions}>
          <TouchableOpacity style={styles.accordionBtn} onPress={() => toggleAll(true)}>
            <Text style={styles.accordionBtnText}>Tout ouvrir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accordionBtn} onPress={() => toggleAll(false)}>
            <Text style={styles.accordionBtnText}>Tout fermer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 1. Sommeil & Fatigue ── */}
      <View style={[styles.card, !expandedSections.sleep && styles.cardCollapsed]}>
        <TouchableOpacity activeOpacity={0.75} style={styles.cardHeader} onPress={() => toggleSection('sleep')}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Moon size={19} color="#6366F1" />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.cardTitle}>Sommeil & Fatigue</Text>
              {!expandedSections.sleep && <Text style={styles.cardSubtitle}>{sleepSummary}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            {(sleepHours !== '' || fatigueLevel) && (
              <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.badgeText, { color: '#6366F1' }]}>
                  {sleepHours ? `${sleepHours}h` : fatigueLevel}
                </Text>
              </View>
            )}
            {expandedSections.sleep ? <ChevronUp size={18} color="#9BA89C" /> : <ChevronDown size={18} color="#9BA89C" />}
          </View>
        </TouchableOpacity>

        {expandedSections.sleep && (
          <View style={styles.cardBody}>
            <Text style={styles.fieldLabel}>Heures de sommeil cette nuit</Text>
            <View style={styles.numericRow}>
              <TextInput
                style={styles.numericInput}
                keyboardType="decimal-pad"
                value={sleepHours}
                onChangeText={setSleepHours}
                placeholder="Ex: 7.5"
                placeholderTextColor="#9BA89C"
              />
              <View style={styles.quickChips}>
                {SLEEP_QUICK.map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setSleepHours(String(h))}
                    style={[styles.chip, sleepHours === String(h) && styles.chipActive]}>
                    <Text style={[styles.chipText, sleepHours === String(h) && styles.chipTextActive]}>
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>État de fatigue au réveil</Text>
            <View style={styles.fatiguePicker}>
              {FATIGUE_OPTIONS.map((opt) => {
                const isSelected = fatigueLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setFatigueLevel(isSelected ? null : opt.id)}
                    style={[
                      styles.fatiguePill,
                      isSelected ? { backgroundColor: opt.color, borderColor: opt.color } : { backgroundColor: opt.bg, borderColor: opt.color + '55' },
                    ]}>
                    <Text style={[styles.fatiguePillText, { color: isSelected ? '#FFFFFF' : opt.color }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* ── 2. Stress & Anxiété ── */}
      <View style={[styles.card, !expandedSections.stress && styles.cardCollapsed]}>
        <TouchableOpacity activeOpacity={0.75} style={styles.cardHeader} onPress={() => toggleSection('stress')}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
              <Flame size={19} color="#EA580C" />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.cardTitle}>Stress, Anxiété & Symptômes</Text>
              {!expandedSections.stress && <Text style={styles.cardSubtitle}>{stressSummary}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            {(anxietyScore !== null || lumpInThroat || conflictWithHusband) && (
              <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.badgeText, { color: '#DC2626' }]}>
                  {anxietyScore !== null ? `${anxietyScore}/10` : 'Noté'}
                </Text>
              </View>
            )}
            {expandedSections.stress ? <ChevronUp size={18} color="#9BA89C" /> : <ChevronDown size={18} color="#9BA89C" />}
          </View>
        </TouchableOpacity>

        {expandedSections.stress && (
          <View style={styles.cardBody}>
            <Text style={styles.fieldLabel}>
              Niveau d'anxiété : {anxietyScore !== null ? `${anxietyScore} / 10` : 'Non renseigné'}
            </Text>
            <View style={styles.anxietyScale}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = anxietyScore === score;
                const color = score >= 7 ? '#EF4444' : score >= 4 ? '#F97316' : '#10B981';
                return (
                  <TouchableOpacity
                    key={score}
                    onPress={() => setAnxietyScore(isSelected ? null : score)}
                    style={[styles.anxietyBtn, isSelected && { backgroundColor: color, borderColor: color }]}>
                    <Text style={[styles.anxietyBtnText, isSelected && { color: '#FFF', fontWeight: '700' }]}>
                      {score}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <AlertTriangle size={17} color={lumpInThroat ? '#DC2626' : '#9BA89C'} />
                <Text style={styles.switchLabel}>Boule dans la gorge</Text>
              </View>
              <Switch value={lumpInThroat} onValueChange={setLumpInThroat} trackColor={{ false: '#DDE4D8', true: '#DC2626' }} />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <HeartCrack size={17} color={conflictWithHusband ? '#E11D48' : '#9BA89C'} />
                <Text style={styles.switchLabel}>Grosse dispute avec mon mari</Text>
              </View>
              <Switch value={conflictWithHusband} onValueChange={setConflictWithHusband} trackColor={{ false: '#DDE4D8', true: '#E11D48' }} />
            </View>
          </View>
        )}
      </View>

      {/* ── 3. Santé des Cheveux ── */}
      <View style={[styles.card, !expandedSections.hair && styles.cardCollapsed]}>
        <TouchableOpacity activeOpacity={0.75} style={styles.cardHeader} onPress={() => toggleSection('hair')}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
              <Sparkles size={19} color="#7C3AED" />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.cardTitle}>Santé des Cheveux</Text>
              {!expandedSections.hair && <Text style={styles.cardSubtitle}>{hairSummary}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            {(hairLossAmount !== '' || hairWashDone || hennaDone || haircutDone) && (
              <View style={[styles.badge, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.badgeText, { color: '#7C3AED' }]}>
                  {hairLossAmount ? `~${hairLossAmount}` : 'Enregistré'}
                </Text>
              </View>
            )}
            {expandedSections.hair ? <ChevronUp size={18} color="#9BA89C" /> : <ChevronDown size={18} color="#9BA89C" />}
          </View>
        </TouchableOpacity>

        {expandedSections.hair && (
          <View style={styles.cardBody}>
            <Text style={styles.fieldLabel}>Perte de cheveux estimée</Text>
            <View style={styles.numericRow}>
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={hairLossAmount}
                onChangeText={setHairLossAmount}
                placeholder="Ex: 50, 100..."
                placeholderTextColor="#9BA89C"
              />
              <View style={styles.quickChips}>
                {['20', '50', '100', '150'].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setHairLossAmount(amt)}
                    style={[styles.chip, hairLossAmount === amt && { ...styles.chipActive, backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]}>
                    <Text style={[styles.chipText, hairLossAmount === amt && styles.chipTextActive]}>
                      ~{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Droplet size={17} color={hairWashDone ? '#06B6D4' : '#9BA89C'} />
                <Text style={styles.switchLabel}>Lavage des cheveux</Text>
              </View>
              <Switch value={hairWashDone} onValueChange={setHairWashDone} trackColor={{ false: '#DDE4D8', true: '#06B6D4' }} />
            </View>

            {hairWashDone && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Type de shampoing :</Text>
                <View style={styles.chipRow}>
                  {SHAMPOO_OPTIONS.map((opt) => {
                    const isSelected = shampooType === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => setShampooType(isSelected ? null : opt.id)}
                        style={[styles.chip, isSelected && { backgroundColor: '#06B6D4', borderColor: '#06B6D4' }]}>
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Sparkles size={17} color={hennaDone ? '#D97706' : '#9BA89C'} />
                <Text style={styles.switchLabel}>Pose de henné</Text>
              </View>
              <Switch value={hennaDone} onValueChange={setHennaDone} trackColor={{ false: '#DDE4D8', true: '#D97706' }} />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Scissors size={17} color={haircutDone ? '#7C3AED' : '#9BA89C'} />
                <Text style={styles.switchLabel}>Coupe de cheveux</Text>
              </View>
              <Switch value={haircutDone} onValueChange={setHaircutDone} trackColor={{ false: '#DDE4D8', true: '#7C3AED' }} />
            </View>

            {haircutDone && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Commentaire sur la coupe :</Text>
                <TextInput
                  style={styles.textInput}
                  value={haircutNotes}
                  onChangeText={setHaircutNotes}
                  placeholder="Ex: Épointage 2 cm..."
                  placeholderTextColor="#9BA89C"
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── 4. Compléments & Médicaments ── */}
      <View style={[styles.card, !expandedSections.meds && styles.cardCollapsed]}>
        <TouchableOpacity activeOpacity={0.75} style={styles.cardHeader} onPress={() => toggleSection('meds')}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Pill size={19} color="#10B981" />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.cardTitle}>Compléments & Médicaments</Text>
              {!expandedSections.meds && (
                <Text style={styles.cardSubtitle}>{medications.filter((m) => m.taken).length} produit(s) sélectionné(s)</Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.badgeText, { color: '#166534' }]}>
                {medications.filter((m) => m.taken).length} pris
              </Text>
            </View>
            {expandedSections.meds ? <ChevronUp size={18} color="#9BA89C" /> : <ChevronDown size={18} color="#9BA89C" />}
          </View>
        </TouchableOpacity>

        {expandedSections.meds && (
          <View style={styles.cardBody}>
            <Text style={styles.hintText}>Cochez les produits pris et ajustez le dosage si besoin.</Text>

            {medications.map((item, index) => {
              const isForcapil = item.name.toLowerCase().includes('forcapil');
              return (
                <View key={item.name} style={styles.medRow}>
                  <TouchableOpacity style={styles.medCheckbox} onPress={() => handleToggleMed(index)}>
                    <View style={[styles.checkbox, item.taken && styles.checkboxActive]}>
                      {item.taken && <Check size={13} color="#FFF" />}
                    </View>
                    <Text style={[styles.medName, item.taken && styles.medNameActive]}>{item.name}</Text>
                  </TouchableOpacity>

                  {isForcapil ? (
                    <View style={styles.doseRow}>
                      {['1 comprimé', '2 comprimés'].map((dose) => (
                        <TouchableOpacity
                          key={dose}
                          onPress={() => handleUpdateMedDosage(index, dose)}
                          style={[styles.doseBadge, item.dosage === dose && styles.doseBadgeActive]}>
                          <Text style={[styles.doseBadgeText, item.dosage === dose && styles.doseBadgeTextActive]}>
                            {dose}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={styles.dosageInput}
                      value={item.dosage}
                      onChangeText={(val) => handleUpdateMedDosage(index, val)}
                      placeholder="Dosage..."
                      placeholderTextColor="#9BA89C"
                    />
                  )}
                </View>
              );
            })}

            {!showAddMed ? (
              <TouchableOpacity style={styles.addMedBtn} onPress={() => setShowAddMed(true)}>
                <Plus size={15} color="#0284C7" />
                <Text style={styles.addMedBtnText}>Ajouter un complément</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addMedCard}>
                <Text style={styles.subLabel}>Nouveau complément :</Text>
                <TextInput
                  style={styles.textInput}
                  value={newMedName}
                  onChangeText={setNewMedName}
                  placeholder="Nom (ex: Zinc, Huile d'onagre…)"
                  placeholderTextColor="#9BA89C"
                />
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  value={newMedDosage}
                  onChangeText={setNewMedDosage}
                  placeholder="Dosage habituel (ex: 1 gélule)"
                  placeholderTextColor="#9BA89C"
                />
                <View style={styles.addMedActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMed(false)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleAddNewMed}>
                    <Text style={styles.confirmBtnText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Bouton Sauvegarder */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Save size={19} color="#FFF" />
        <Text style={styles.saveBtnText}>
          {saving ? 'Enregistrement…' : `Enregistrer le ${selectedDate}`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E4E8DB' },
  content: { padding: 16, paddingBottom: 60 },

  accordionControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  accordionHint: { fontSize: 12, color: '#8A9080', fontWeight: '500' },
  accordionActions: { flexDirection: 'row', gap: 8 },
  accordionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#DDE4D8',
  },
  accordionBtnText: { fontSize: 11, fontWeight: '700', color: '#1A1C1F' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: '#1A2E14',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardCollapsed: { paddingVertical: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerTexts: { flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1C1F', letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 12, color: '#9BA89C', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  cardBody: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F4EB',
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1C1F', marginBottom: 10 },
  subLabel: { fontSize: 12, fontWeight: '500', color: '#637064', marginBottom: 8 },
  hintText: { fontSize: 12, color: '#9BA89C', marginBottom: 12 },

  numericRow: { marginBottom: 4 },
  numericInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#DDE4D8',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1C1F',
    backgroundColor: '#F8FAF5',
    marginBottom: 10,
  },
  quickChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#DDE4D8',
    backgroundColor: '#F8FAF5',
  },
  chipActive: { backgroundColor: '#1A1C1F', borderColor: '#1A1C1F' },
  chipText: { fontSize: 12, color: '#637064', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  fatiguePicker: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fatiguePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  fatiguePillText: { fontSize: 13, fontWeight: '700' },

  anxietyScale: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  anxietyBtn: {
    width: 33,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDE4D8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF5',
  },
  anxietyBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F0F4EB',
  },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  switchLabel: { fontSize: 14, color: '#1A1C1F', fontWeight: '500' },

  subSection: { backgroundColor: '#F8FAF5', padding: 12, borderRadius: 16, marginVertical: 8 },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#DDE4D8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    fontSize: 13,
    color: '#1A1C1F',
  },

  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EB',
  },
  medCheckbox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  medName: { fontSize: 14, color: '#637064' },
  medNameActive: { color: '#1A1C1F', fontWeight: '600' },
  dosageInput: {
    width: 110,
    height: 34,
    borderWidth: 1,
    borderColor: '#DDE4D8',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#F8FAF5',
    textAlign: 'right',
  },
  doseRow: { flexDirection: 'row', gap: 6 },
  doseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE4D8',
    backgroundColor: '#F8FAF5',
  },
  doseBadgeActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  doseBadgeText: { fontSize: 11, color: '#637064', fontWeight: '500' },
  doseBadgeTextActive: { color: '#FFFFFF', fontWeight: '700' },

  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  addMedBtnText: { fontSize: 13, color: '#0284C7', fontWeight: '700' },
  addMedCard: {
    backgroundColor: '#F8FAF5',
    padding: 14,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDE4D8',
  },
  addMedActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  cancelBtnText: { fontSize: 13, color: '#637064' },
  confirmBtn: { backgroundColor: '#0284C7', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  confirmBtnText: { fontSize: 13, color: '#FFF', fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1C1F',
    paddingVertical: 16,
    borderRadius: 999,
    gap: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
});

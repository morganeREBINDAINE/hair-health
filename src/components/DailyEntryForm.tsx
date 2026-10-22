import React, { useState, useEffect } from 'react';
import { Toast } from '../lib/toast';
import { useInitialSyncing } from '../lib/syncEvent';
import { View, StyleSheet, Pressable, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Brain,
  Wind,
  HeartCrack,
  Pill,
  Check,
  CirclePlus,
  Sparkles,
  ShowerHead,
  Leaf,
  Scissors,
  Moon,
  Droplets,
  Droplet,
  Clock,
  CircleCheck,
} from 'lucide-react-native';
import { CycleStatus, DailyLog, DailyMedicationItem, FatigueLevel, MedicationDefinition, ShampooType, TreatmentPlan } from '../types';
import { StorageService } from '../services/storageService';
import { Palette, Spacing, DockClearance, Radius, Type } from '../constants/theme';
import {
  AppText,
  Badge,
  Card,
  Chip,
  PillButton,
  SectionHeader,
  Segmented,
  Toggle,
  ToggleRow,
  inputStyle,
  type BadgeTone,
  SkeletonCard,
} from './ui';
import { frDate, todayIso } from '../lib/dates';
import {
  NOTE_MAX_LENGTH,
  flowLabel,
  getCycleStatus,
  hasMenstrualData,
  normalizeTime,
  shouldShowCycleCard,
} from '../lib/cycle';

interface DailyEntryFormProps {
  selectedDate: string;
  onSaved?: () => void;
  /** Contenu affiché en tête du formulaire (défile avec lui). */
  header?: React.ReactNode;
}

const SHAMPOO_OPTIONS: { id: ShampooType; label: string }[] = [
  { id: 'bebe', label: 'Shampoing bébé' },
  { id: 'sans_sulfate', label: 'Sans sulfate' },
  { id: 'avec_sulfate', label: 'Avec sulfate' },
  { id: 'traitant', label: 'Traitant' },
];

const FATIGUE_OPTIONS: { id: FatigueLevel; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'légère', label: 'Légère' },
  { id: 'modérée', label: 'Modérée' },
  { id: 'importante', label: 'Importante' },
];


const SLEEP_QUICK: number[] = [5, 6, 7, 8, 9];

const currentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

function cycleSubtitle(status: CycleStatus | null): string {
  if (!status) return '';
  switch (status.kind) {
    case 'ongoing':
      return `Jour ${status.day} des règles`;
    case 'window':
      return `Règles attendues vers le ${frDate(status.prediction.nextStart)}`;
    case 'late':
      return `Retard de ${status.daysLate} jour${status.daysLate > 1 ? 's' : ''}`;
    default:
      return 'Déclaration du début des règles';
  }
}

function anxietyBadge(score: number | null): { label: string; tone: BadgeTone } {
  if (score === null) return { label: 'Non renseigné', tone: 'neutral' };
  if (score === 0) return { label: `0 / 10 · Paisible`, tone: 'lime' };
  if (score <= 3) return { label: `${score} / 10 · Léger`, tone: 'limeSoft' };
  if (score <= 6) return { label: `${score} / 10 · Modéré`, tone: 'lime' };
  if (score <= 8) return { label: `${score} / 10 · Élevé`, tone: 'coralSoft' };
  return { label: `${score} / 10 · Aigu`, tone: 'coral' };
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ selectedDate, onSaved, header }) => {
  const [loading, setLoading] = useState(true);
  const initialSyncing = useInitialSyncing();
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

  const [, setMedDefinitions] = useState<MedicationDefinition[]>([]);
  const [medications, setMedications] = useState<DailyMedicationItem[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [showAddMed, setShowAddMed] = useState(false);

  // Suivi menstruel
  const [cycleCardVisible, setCycleCardVisible] = useState(false);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus | null>(null);
  const [periodToday, setPeriodToday] = useState(false);
  const [flow, setFlow] = useState<number | null>(null);
  const [pain, setPain] = useState(false);
  const [periodNote, setPeriodNote] = useState('');
  const [periodEnded, setPeriodEnded] = useState(false);
  const [endTime, setEndTime] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const rawDefs = await StorageService.getMedications();
      const seen = new Set<string>();
      const defs = rawDefs.filter((d) => {
        const key = d.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const plans = await StorageService.getTreatmentPlans();
      const activePlans = StorageService.getActivePlansForDate(plans, selectedDate);
      for (const plan of activePlans) {
        const key = plan.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          defs.push({
            id: `plan-${plan.id}`,
            name: plan.name,
            defaultDosage: plan.dosage,
            isPrechecked: true,
            isActive: true,
            category: 'supplement',
            displayOrder: defs.length + 1,
          });
        }
      }

      setMedDefinitions(defs);

      const allLogs = await StorageService.getAllDailyLogs();
      const existingLog = allLogs[selectedDate] ?? null;

      const status = getCycleStatus(allLogs, selectedDate);
      setCycleStatus(status);
      setCycleCardVisible(shouldShowCycleCard(allLogs, selectedDate));
      if (existingLog && hasMenstrualData(existingLog)) {
        setPeriodToday(existingLog.menstrualFlow != null);
        setFlow(existingLog.menstrualFlow ?? null);
        setPain(existingLog.menstrualPain ?? false);
        setPeriodNote(existingLog.menstrualNote ?? '');
        setPeriodEnded(existingLog.menstrualEndedAt != null);
        setEndTime(existingLog.menstrualEndedAt ?? '');
      } else {
        // Règles en cours sans fin déclarée : « Règles aujourd'hui » pré-cochée
        setPeriodToday(status.kind === 'ongoing');
        setFlow(null);
        setPain(false);
        setPeriodNote('');
        setPeriodEnded(false);
        setEndTime('');
      }

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
        setSleepHours(
          existingLog.sleepHours !== null && existingLog.sleepHours !== undefined ? String(existingLog.sleepHours) : ''
        );
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

  // Chargement asynchrone depuis le stockage à chaque changement de date, et à la fin de la synchro de connexion
  useEffect(() => {
    if (initialSyncing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, initialSyncing]);

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
    } catch {
      Toast.error('Connexion requise pour ajouter un complément');
    }
  };

  // Erreurs de saisie du cycle, affichées sous les champs concernés
  const cycleErrors: { flow?: string; note?: string; time?: string } = {};
  if (cycleCardVisible) {
    if (periodToday && flow === null) cycleErrors.flow = "Indique l'intensité du flux (1 à 10).";
    if (periodToday && periodNote.length > NOTE_MAX_LENGTH)
      cycleErrors.note = `La note ne doit pas dépasser ${NOTE_MAX_LENGTH} caractères.`;
    if (periodEnded) {
      const time = normalizeTime(endTime);
      if (!endTime.trim()) cycleErrors.time = "Indique l'heure de fin des règles.";
      else if (!time) cycleErrors.time = 'Heure invalide, format attendu : 14:30.';
      else if (selectedDate === todayIso() && time > currentTime())
        cycleErrors.time = "L'heure de fin ne peut pas être dans le futur.";
    }
  }
  const hasCycleErrors = Object.keys(cycleErrors).length > 0;

  const handleDeclarePeriod = () => {
    setCycleCardVisible(true);
    setPeriodToday(true);
  };

  const handleSave = async () => {
    if (hasCycleErrors) return;
    setSaving(true);
    try {
      const parsedHairLoss = hairLossAmount.trim() === '' ? null : parseInt(hairLossAmount, 10);
      const parsedSleep = sleepHours.trim() === '' ? null : parseFloat(sleepHours.replace(',', '.'));

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
        menstrualFlow: cycleCardVisible && periodToday ? flow : null,
        menstrualPain: cycleCardVisible && periodToday ? pain : null,
        menstrualNote: cycleCardVisible && periodToday ? periodNote.trim() : '',
        menstrualEndedAt: cycleCardVisible && periodEnded ? normalizeTime(endTime) : null,
      };

      await StorageService.saveDailyLog(log);
      Alert.alert('Journée enregistrée ✓', `Journée du ${frDate(selectedDate)} sauvegardée.`);
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Erreur enregistrement journal:', e);
      Toast.error('Connexion requise pour enregistrer');
    } finally {
      setSaving(false);
    }
  };

  const takenCount = medications.filter((m) => m.taken).length;
  const anxiety = anxietyBadge(anxietyScore);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {header}

        {initialSyncing && (
          <View style={styles.sections}>
            <SkeletonCard lines={2} height={120} />
            <SkeletonCard lines={3} height={160} />
            <SkeletonCard lines={3} height={160} />
          </View>
        )}
        <View
          style={[styles.sections, loading && { opacity: 0.5 }, initialSyncing && { display: 'none' }]}
          pointerEvents={loading ? 'none' : 'auto'}>
          {/* ── 0. Cycle menstruel (proposé seulement au bon moment) ── */}
          {cycleCardVisible && (
            <Card style={styles.section}>
              <SectionHeader
                icon={Droplet}
                iconBg={Palette.raspberrySoft}
                iconColor={Palette.raspberry}
                title="Cycle menstruel"
                subtitle={cycleSubtitle(cycleStatus)}
              />
              <ToggleRow
                icon={Droplet}
                title="Règles aujourd'hui"
                subtitle="Flux, douleur et note du jour"
                value={periodToday}
                onValueChange={setPeriodToday}
                activeColor={Palette.raspberry}
                activeBg={Palette.raspberrySoft}
              />
              {periodToday && (
                <View style={{ gap: 16 }}>
                  <View style={{ gap: 8 }}>
                    <View style={styles.rowBetween}>
                      <AppText variant="labelMd">Flux</AppText>
                      {flow !== null && <Badge label={`${flow} / 10 · ${flowLabel(flow)}`} tone="neutral" />}
                    </View>
                    <View style={styles.rowBetween}>
                      <AppText variant="bodySm" color={Palette.textMuted}>
                        1 (Très léger)
                      </AppText>
                      <AppText variant="bodySm" color={Palette.textMuted}>
                        10 (Très abondant)
                      </AppText>
                    </View>
                    <View style={styles.scale}>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const value = i + 1;
                        const selected = flow === value;
                        return (
                          <Pressable
                            key={value}
                            onPress={() => setFlow(selected ? null : value)}
                            style={({ pressed }) => [
                              styles.scaleBtn,
                              selected && { backgroundColor: Palette.raspberry },
                              pressed && { transform: [{ scale: 0.9 }] },
                            ]}>
                            <AppText variant="labelMd" color={selected ? '#FFFFFF' : Palette.text}>
                              {value}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                    {cycleErrors.flow && <FieldError text={cycleErrors.flow} />}
                  </View>

                  <View style={styles.inlineRow}>
                    <AppText variant="labelMd">Douleur</AppText>
                    <Segmented
                      options={[
                        { id: 'absente', label: 'Absente' },
                        { id: 'presente', label: 'Présente' },
                      ]}
                      value={pain ? 'presente' : 'absente'}
                      onChange={(v) => setPain(v === 'presente')}
                    />
                  </View>

                  <View style={{ gap: 6 }}>
                    <TextInput
                      style={[inputStyle, styles.noteInput]}
                      value={periodNote}
                      onChangeText={setPeriodNote}
                      placeholder="Petite note (ex : crampes le matin)"
                      placeholderTextColor={Palette.textMuted}
                      multiline
                    />
                    <View style={styles.rowBetween}>
                      {cycleErrors.note ? <FieldError text={cycleErrors.note} /> : <View />}
                      <AppText
                        variant="bodySm"
                        color={periodNote.length > NOTE_MAX_LENGTH ? Palette.error : Palette.textMuted}>
                        {periodNote.length} / {NOTE_MAX_LENGTH}
                      </AppText>
                    </View>
                  </View>
                </View>
              )}

              <ToggleRow
                icon={Clock}
                title="Plus de règles"
                subtitle="Les règles se sont arrêtées aujourd'hui"
                value={periodEnded}
                onValueChange={setPeriodEnded}
                activeColor={Palette.raspberry}
                activeBg={Palette.raspberrySoft}
              />
              {periodEnded && (
                <View style={{ gap: 6 }}>
                  <AppText variant="labelMd">Heure de fin</AppText>
                  <TextInput
                    style={inputStyle}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="Ex : 14:30"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  {cycleErrors.time && <FieldError text={cycleErrors.time} />}
                  {periodToday && !cycleErrors.time && (
                    <AppText variant="bodySm" color={Palette.textMuted}>
                      Règles le matin, arrêtées à {normalizeTime(endTime)}.
                    </AppText>
                  )}
                </View>
              )}
            </Card>
          )}

          {/* ── 1. Anxiété & état mental ── */}
          <Card style={styles.section}>
            <SectionHeader
              icon={Brain}
              iconBg={Palette.coralSoft}
              iconColor={Palette.coralDeep}
              title="Anxiété & état mental"
              right={<Badge label={anxiety.label} tone={anxiety.tone} />}
            />
            <View style={{ gap: 8 }}>
              <View style={styles.rowBetween}>
                <AppText variant="bodySm" color={Palette.textMuted}>
                  0 (Paisible)
                </AppText>
                <AppText variant="bodySm" color={Palette.textMuted}>
                  10 (Accablant)
                </AppText>
              </View>
              <View style={styles.scale}>
                {Array.from({ length: 11 }).map((_, score) => {
                  const selected = anxietyScore === score;
                  return (
                    <Pressable
                      key={score}
                      onPress={() => setAnxietyScore(selected ? null : score)}
                      style={({ pressed }) => [
                        styles.scaleBtn,
                        selected && styles.scaleBtnActive,
                        pressed && { transform: [{ scale: 0.9 }] },
                      ]}>
                      <AppText variant="labelMd" color={selected ? '#FFFFFF' : Palette.text}>
                        {score}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <ToggleRow
              icon={Wind}
              title="Boule dans la gorge"
              subtitle="Sensation d'oppression ou spasme"
              value={lumpInThroat}
              onValueChange={setLumpInThroat}
              activeColor={Palette.coralDeep}
              activeBg={Palette.coralSoft}
            />
            <ToggleRow
              icon={HeartCrack}
              title="Grosse dispute de couple"
              subtitle="Événement de stress relationnel aigu"
              value={conflictWithHusband}
              onValueChange={setConflictWithHusband}
              activeColor={Palette.coralDeep}
              activeBg={Palette.coralSoft}
            />
          </Card>

          {/* ── 2. Sommeil & fatigue ── */}
          <Card style={styles.section}>
            <SectionHeader
              icon={Moon}
              title="Sommeil & fatigue"
              subtitle="Nuit dernière et état au réveil"
              right={sleepHours ? <Badge label={`${sleepHours} h`} tone="neutral" /> : undefined}
            />
            <View style={{ gap: 10 }}>
              <AppText variant="labelMd">Heures de sommeil</AppText>
              <View style={styles.wrap}>
                {SLEEP_QUICK.map((h) => (
                  <Chip
                    key={h}
                    label={`${h} h`}
                    selected={sleepHours === String(h)}
                    onPress={() => setSleepHours(sleepHours === String(h) ? '' : String(h))}
                    style={styles.flatChip}
                  />
                ))}
              </View>
              <TextInput
                style={inputStyle}
                keyboardType="decimal-pad"
                value={sleepHours}
                onChangeText={setSleepHours}
                placeholder="Ou valeur précise, ex : 7.5"
                placeholderTextColor={Palette.textMuted}
              />
            </View>
            <View style={{ gap: 10 }}>
              <AppText variant="labelMd">Fatigue au réveil</AppText>
              <View style={styles.wrap}>
                {FATIGUE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.id}
                    label={opt.label}
                    selected={fatigueLevel === opt.id}
                    onPress={() => setFatigueLevel(fatigueLevel === opt.id ? null : opt.id)}
                    style={styles.flatChip}
                  />
                ))}
              </View>
            </View>
          </Card>

          {/* ── 3. Traitements & suppléments ── */}
          <Card style={styles.section}>
            <SectionHeader
              icon={Pill}
              iconBg={Palette.limeSoft}
              iconColor={Palette.primary}
              title="Traitements & suppléments"
              subtitle="Coche ce qui a été pris aujourd'hui"
              right={<Badge label={`${takenCount} / ${medications.length} pris`} tone="limeSoft" />}
            />
            <View style={{ gap: 8 }}>
              {medications.map((item, index) => {
                const isForcapil = item.name.toLowerCase().includes('forcapil');
                return (
                  <View key={item.name} style={[styles.medRow, item.taken && styles.medRowActive]}>
                    <Pressable style={styles.medLeft} onPress={() => handleToggleMed(index)} hitSlop={4}>
                      <View style={[styles.checkbox, item.taken && styles.checkboxActive]}>
                        {item.taken && <Check size={14} color={Palette.onLime} strokeWidth={3} />}
                      </View>
                      <AppText
                        variant="bodyMd"
                        color={item.taken ? Palette.text : Palette.textMuted}
                        style={{ flexShrink: 1, fontFamily: item.taken ? Type.labelMd.fontFamily : Type.bodyMd.fontFamily }}>
                        {item.name}
                      </AppText>
                    </Pressable>
                    {isForcapil ? (
                      <Segmented
                        options={[
                          { id: '1 comprimé', label: '1 comp.' },
                          { id: '2 comprimés', label: '2 comp.' },
                        ]}
                        value={item.dosage}
                        onChange={(dose) => handleUpdateMedDosage(index, dose)}
                      />
                    ) : (
                      <TextInput
                        style={styles.dosageInput}
                        value={item.dosage}
                        onChangeText={(val) => handleUpdateMedDosage(index, val)}
                        placeholder="Dosage"
                        placeholderTextColor={Palette.textMuted}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {!showAddMed ? (
              <PillButton
                label="Ajouter un médicament / complément"
                icon={CirclePlus}
                variant="ghost"
                compact
                onPress={() => setShowAddMed(true)}
              />
            ) : (
              <View style={styles.addMed}>
                <AppText variant="labelMd">Nouveau complément</AppText>
                <TextInput
                  style={[inputStyle, styles.inputOnLow]}
                  value={newMedName}
                  onChangeText={setNewMedName}
                  placeholder="Nom (ex : Zinc, Huile d'onagre…)"
                  placeholderTextColor={Palette.textMuted}
                />
                <TextInput
                  style={[inputStyle, styles.inputOnLow]}
                  value={newMedDosage}
                  onChangeText={setNewMedDosage}
                  placeholder="Dosage habituel (ex : 1 gélule)"
                  placeholderTextColor={Palette.textMuted}
                />
                <View style={styles.addMedActions}>
                  <PillButton label="Annuler" variant="ghost" compact onPress={() => setShowAddMed(false)} style={{ flex: 1 }} />
                  <PillButton label="Ajouter" variant="lime" icon={Check} compact onPress={handleAddNewMed} style={{ flex: 1 }} />
                </View>
              </View>
            )}
          </Card>

          {/* ── 4. Cheveux & soins ── */}
          <Card style={styles.section}>
            <SectionHeader
              icon={Sparkles}
              iconBg={Palette.limeSoft}
              iconColor={Palette.primary}
              title="Cheveux & soins"
              subtitle="Suivi de la vitalité capillaire"
            />

            <View style={{ gap: 10 }}>
              <AppText variant="labelMd">Chute au réveil brossage + après lavage</AppText>
              <TextInput
                style={inputStyle}
                keyboardType="numeric"
                value={hairLossAmount}
                onChangeText={setHairLossAmount}
                placeholder="Nombre estimé, ex : 35"
                placeholderTextColor={Palette.textMuted}
              />
            </View>

            <ToggleRow icon={ShowerHead} title="Lavage des cheveux" value={hairWashDone} onValueChange={setHairWashDone} />
            {hairWashDone && (
              <View style={styles.wrap}>
                {SHAMPOO_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.id}
                    label={opt.label}
                    icon={Droplets}
                    selected={shampooType === opt.id}
                    onPress={() => setShampooType(shampooType === opt.id ? null : opt.id)}
                    style={styles.flatChip}
                  />
                ))}
              </View>
            )}

            <View style={styles.inlineRow}>
              <View style={styles.inlineLeft}>
                <Leaf size={18} color={hennaDone ? Palette.primary : Palette.textMuted} />
                <AppText variant="labelMd">Soin henné</AppText>
              </View>
              <Segmented
                options={[
                  { id: 'non', label: 'Non' },
                  { id: 'oui', label: 'Oui' },
                ]}
                value={hennaDone ? 'oui' : 'non'}
                onChange={(v) => setHennaDone(v === 'oui')}
              />
            </View>

            <View style={[styles.inlineRow, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <View style={styles.rowBetween}>
                <View style={styles.inlineLeft}>
                  <Scissors size={18} color={haircutDone ? Palette.primary : Palette.textMuted} />
                  <AppText variant="labelMd">Coupe de cheveux</AppText>
                </View>
                <Toggle value={haircutDone} onValueChange={setHaircutDone} />
              </View>
              {haircutDone && (
                <TextInput
                  style={[inputStyle, { backgroundColor: Palette.card }]}
                  value={haircutNotes}
                  onChangeText={setHaircutNotes}
                  placeholder="Ex : pointes coupées de 1 cm…"
                  placeholderTextColor={Palette.textMuted}
                />
              )}
            </View>
          </Card>

          {!cycleCardVisible && (
            <PillButton
              label="Mes règles ont commencé"
              icon={Droplet}
              variant="ghost"
              compact
              onPress={handleDeclarePeriod}
            />
          )}

          <View style={{ gap: 10, marginTop: 4 }}>
            <PillButton
              label={saving ? 'Sauvegarde en cours…' : 'Enregistrer la journée'}
              icon={CircleCheck}
              loading={saving}
              disabled={hasCycleErrors}
              onPress={handleSave}
            />
            {hasCycleErrors && (
              <AppText variant="bodySm" color={Palette.error} style={{ textAlign: 'center' }}>
                Corrige la carte « Cycle menstruel » pour enregistrer.
              </AppText>
            )}
            <AppText variant="bodySm" color={Palette.textMuted} style={{ textAlign: 'center' }}>
              Journée du {frDate(selectedDate)}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function FieldError({ text }: { text: string }) {
  return (
    <AppText variant="bodySm" color={Palette.error} style={{ flexShrink: 1 }}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.canvas },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sections: { gap: Spacing.md },
  section: { gap: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flatChip: { backgroundColor: Palette.containerLow, shadowOpacity: 0, elevation: 0 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', gap: 3 },
  scaleBtn: {
    flex: 1,
    height: 42,
    maxWidth: 40,
    borderRadius: Radius.full,
    backgroundColor: Palette.containerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnActive: { backgroundColor: Palette.obsidian },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  medRowActive: { backgroundColor: 'rgba(142,227,65,0.12)' },
  medLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.outlineVariant,
    backgroundColor: Palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Palette.lime, borderColor: Palette.lime },
  dosageInput: {
    minWidth: 92,
    maxWidth: 130,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Palette.card,
    paddingHorizontal: 12,
    fontFamily: Type.bodySm.fontFamily,
    fontSize: 12,
    color: Palette.textVariant,
    textAlign: 'center',
  },
  addMed: { gap: 10, backgroundColor: Palette.containerLow, borderRadius: Radius.lg, padding: 14 },
  inputOnLow: { backgroundColor: Palette.card },
  addMedActions: { flexDirection: 'row', gap: 8 },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.lg,
    padding: 14,
  },
  inlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteInput: {
    height: undefined,
    minHeight: 72,
    borderRadius: Radius.lg,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
});

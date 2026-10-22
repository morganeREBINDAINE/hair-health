import React, { useState, useEffect, useCallback } from 'react';
import { SyncEvent, useInitialSyncing } from '../lib/syncEvent';
import { Toast } from '../lib/toast';
import { View, StyleSheet, ScrollView, Alert, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  FileSpreadsheet,
  Share2,
  CircleCheck,
  LogOut,
  Sparkles,
  Pill,
  Activity,
  FlaskConical,
  SlidersHorizontal,
  User,
  Trash2,
  Check,
  CirclePlus,
  Clock,
  Repeat,
  CalendarDays,
  X,
  Syringe,
  Droplet,
} from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { MedicationDefinition, TreatmentPlan, TreatmentType, LabMarkerDefinition } from '../types';
import { ExcelService, ExportFilterOptions } from '../services/excelService';
import { StorageService } from '../services/storageService';
import { supabase } from '../lib/supabase';
import { Palette, Spacing, DockClearance, Radius, Type } from '../constants/theme';
import {
  AppText,
  Card,
  Chip,
  IconCircle,
  PillButton,
  ScreenHeader,
  SectionHeader,
  Segmented,
  Skeleton,
  Toggle,
  ToggleRow,
  inputStyle,
} from '../components/ui';
import { frDate, todayIso } from '../lib/dates';
import '../lib/calendarLocale';

type DatePreset = '7d' | '30d' | '90d' | 'all';

export default function SettingsScreen() {
  const [medications, setMedications] = useState<MedicationDefinition[]>([]);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editDosage, setEditDosage] = useState('');
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');

  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);
  const [planType, setPlanType] = useState<TreatmentType>('cure');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planDosage, setPlanDosage] = useState('');
  const [planStartDate, setPlanStartDate] = useState(todayIso());
  const [planEndDate, setPlanEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [planBloodTestDate, setPlanBloodTestDate] = useState('');
  const [showBloodPicker, setShowBloodPicker] = useState(false);
  const [planBloodMarkers, setPlanBloodMarkers] = useState<string[]>([]);
  const [labMarkers, setLabMarkers] = useState<LabMarkerDefinition[]>([]);

  const [exporting, setExporting] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [includeSymptoms, setIncludeSymptoms] = useState(true);
  const [includeHairCare, setIncludeHairCare] = useState(true);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeCycle, setIncludeCycle] = useState(true);
  const [includeLabTests, setIncludeLabTests] = useState(true);
  const [includeLabNorms, setIncludeLabNorms] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setMedications(await StorageService.getMedications());
    setTreatmentPlans(await StorageService.getTreatmentPlans());
    setLabMarkers(await StorageService.getLabMarkers());
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // Rafraîchi à la fin de chaque synchro cloud
  useEffect(() => SyncEvent.subscribe(() => { loadAll(); }), [loadAll]);
  const initialSyncing = useInitialSyncing();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { authListener?.subscription.unsubscribe(); };
  }, []);

  // ── Medication handlers ──
  const handleStartEditDosage = (med: MedicationDefinition) => {
    setEditingMedId(med.id);
    setEditDosage(med.defaultDosage);
  };

  const handleSaveDosage = async (med: MedicationDefinition) => {
    try {
      const updated = { ...med, defaultDosage: editDosage.trim() };
      setMedications(await StorageService.updateMedication(updated));
      setEditingMedId(null);
    } catch {
      Toast.error('Connexion requise pour modifier');
    }
  };

  const handleTogglePrechecked = async (med: MedicationDefinition) => {
    try {
      setMedications(await StorageService.toggleMedicationPrechecked(med.id));
    } catch {
      Toast.error('Connexion requise pour modifier');
    }
  };

  const handleDeleteMed = (med: MedicationDefinition) => {
    Alert.alert('Supprimer', `Retirer « ${med.name} » de la liste par défaut ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          setMedications(await StorageService.deleteMedication(med.id));
        } catch {
          Toast.error('Connexion requise pour supprimer');
        }
      }},
    ]);
  };

  const handleAddMed = async () => {
    if (!newMedName.trim()) return;
    setSaving(true);
    try {
      setMedications(await StorageService.addMedication(newMedName.trim(), newMedDosage.trim(), false));
      setNewMedName('');
      setNewMedDosage('');
      setShowAddMed(false);
    } catch {
      Toast.error('Connexion requise pour ajouter');
    } finally {
      setSaving(false);
    }
  };

  // ── Treatment plan handlers ──
  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanType('cure');
    setPlanName('');
    setPlanDescription('');
    setPlanDosage('');
    setPlanStartDate(todayIso());
    setPlanEndDate('');
    setPlanBloodTestDate('');
    setPlanBloodMarkers([]);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowBloodPicker(false);
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: TreatmentPlan) => {
    setEditingPlan(plan);
    setPlanType(plan.type);
    setPlanName(plan.name);
    setPlanDescription(plan.description || '');
    setPlanDosage(plan.dosage);
    setPlanStartDate(plan.startDate);
    setPlanEndDate(plan.endDate || '');
    setPlanBloodTestDate(plan.plannedBloodTest?.date || '');
    setPlanBloodMarkers(plan.plannedBloodTest?.markerCodes || []);
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!planName.trim() || !planDosage.trim()) {
      Alert.alert('Champs requis', 'Nom et dosage sont obligatoires.');
      return;
    }
    if (planType === 'cure' && !planEndDate) {
      Alert.alert('Date de fin', 'Une cure doit avoir une date de fin.');
      return;
    }

    const plan: TreatmentPlan = {
      id: editingPlan?.id ?? `plan-${Date.now()}`,
      type: planType,
      name: planName.trim(),
      description: planDescription.trim() || undefined,
      dosage: planDosage.trim(),
      startDate: planStartDate,
      endDate: planType === 'cure' ? planEndDate : undefined,
      plannedBloodTest: planBloodTestDate ? { date: planBloodTestDate, markerCodes: planBloodMarkers } : undefined,
      isActive: editingPlan?.isActive ?? true,
      createdAt: editingPlan?.createdAt ?? new Date().toISOString(),
    };

    setSaving(true);
    try {
      setTreatmentPlans(await StorageService.saveTreatmentPlan(plan));
      setShowPlanModal(false);
    } catch {
      Toast.error('Connexion requise pour enregistrer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = (plan: TreatmentPlan) => {
    Alert.alert('Supprimer', `Supprimer le plan « ${plan.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          setTreatmentPlans(await StorageService.deleteTreatmentPlan(plan.id));
        } catch {
          Toast.error('Connexion requise pour supprimer');
        }
      }},
    ]);
  };

  const handleTogglePlanActive = async (plan: TreatmentPlan) => {
    try {
      const updated = { ...plan, isActive: !plan.isActive };
      setTreatmentPlans(await StorageService.saveTreatmentPlan(updated));
    } catch {
      Toast.error('Connexion requise pour modifier');
    }
  };

  const toggleBloodMarker = (code: string) => {
    setPlanBloodMarkers((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  // ── Export handler ──
  const handleLogout = async () => {
    await supabase.auth.signOut();
    await StorageService.clearCache();
    setUser(null);
    Alert.alert('Connexion', 'Vous avez bien été déconnecté.');
  };

  const handleGenerateExcel = async () => {
    setExporting(true);
    try {
      let startDate: string | undefined;
      const now = new Date();
      if (datePreset === '7d') { const d = new Date(); d.setDate(now.getDate() - 7); startDate = d.toISOString().slice(0, 10); }
      else if (datePreset === '30d') { const d = new Date(); d.setDate(now.getDate() - 30); startDate = d.toISOString().slice(0, 10); }
      else if (datePreset === '90d') { const d = new Date(); d.setDate(now.getDate() - 90); startDate = d.toISOString().slice(0, 10); }
      const options: ExportFilterOptions = { startDate, endDate: now.toISOString().slice(0, 10), includeSymptoms, includeHairCare, includeMedications, includeCycle, includeLabTests, includeLabNorms };
      const result = await ExcelService.generateAndShareExport(options);
      if (!result.success) Alert.alert('Erreur', result.message || "Erreur d'export.");
    } catch (e: any) {
      Alert.alert('Erreur', e.message || "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  const fondPlans = treatmentPlans.filter((p) => p.type === 'fond');
  const curePlans = treatmentPlans.filter((p) => p.type === 'cure');

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Paramètres" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Plans de traitement ── */}
        <Card style={{ gap: 16 }}>
          <SectionHeader
            icon={Clock}
            iconBg={Palette.limeSoft}
            iconColor={Palette.primary}
            title="Planification des cures"
            subtitle="Traitements de fond & cures ponctuelles"
          />

          {initialSyncing && (
            <View style={{ gap: 8 }}>
              <Skeleton height={56} radius={20} />
              <Skeleton height={56} radius={20} />
            </View>
          )}

          {fondPlans.length > 0 && (
            <View style={{ gap: 8 }}>
              <AppText variant="labelMd" color={Palette.textVariant}>Traitement de fond</AppText>
              {fondPlans.map((plan) => (
                <PlanRow key={plan.id} plan={plan} onEdit={() => handleEditPlan(plan)} onDelete={() => handleDeletePlan(plan)} onToggle={() => handleTogglePlanActive(plan)} />
              ))}
            </View>
          )}

          {curePlans.length > 0 && (
            <View style={{ gap: 8 }}>
              <AppText variant="labelMd" color={Palette.textVariant}>Cures ponctuelles</AppText>
              {curePlans.map((plan) => (
                <PlanRow key={plan.id} plan={plan} onEdit={() => handleEditPlan(plan)} onDelete={() => handleDeletePlan(plan)} onToggle={() => handleTogglePlanActive(plan)} />
              ))}
            </View>
          )}

          <PillButton label="Ajouter un plan" icon={CirclePlus} variant="ghost" compact onPress={handleOpenAddPlan} />
        </Card>

        {/* ── Traitements par défaut ── */}
        <Card style={{ gap: 16 }}>
          <SectionHeader
            icon={Pill}
            iconBg={Palette.limeSoft}
            iconColor={Palette.primary}
            title="Traitements par défaut"
            subtitle="Dosages et liste pré-cochée chaque jour"
          />
          {initialSyncing && (
            <View style={{ gap: 8 }}>
              <Skeleton height={52} radius={20} />
              <Skeleton height={52} radius={20} />
              <Skeleton height={52} radius={20} />
            </View>
          )}
          <View style={{ gap: 8 }}>
            {medications.map((med) => {
              const isEditing = editingMedId === med.id;
              return (
                <View key={med.id} style={styles.medRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="labelMd">{med.name}</AppText>
                    {isEditing ? (
                      <View style={styles.editRow}>
                        <TextInput style={[inputStyle, styles.dosageInput]} value={editDosage} onChangeText={setEditDosage} placeholder="Dosage" placeholderTextColor={Palette.textMuted} autoFocus />
                        <PillButton label="OK" icon={Check} variant="lime" compact onPress={() => handleSaveDosage(med)} />
                      </View>
                    ) : (
                      <Pressable onPress={() => handleStartEditDosage(med)}>
                        <AppText variant="bodySm" color={Palette.textMuted}>{med.defaultDosage || 'Aucun dosage — appuyer pour modifier'}</AppText>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.medActions}>
                    <View style={styles.precheckedToggle}>
                      <AppText variant="labelSm" color={Palette.textMuted}>Pré-coché</AppText>
                      <Toggle value={med.isPrechecked} onValueChange={() => handleTogglePrechecked(med)} />
                    </View>
                    <Pressable onPress={() => handleDeleteMed(med)} hitSlop={6} style={styles.deleteBtn}>
                      <Trash2 size={16} color={Palette.coralDeep} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
          {!showAddMed ? (
            <PillButton label="Ajouter un traitement" icon={CirclePlus} variant="ghost" compact onPress={() => setShowAddMed(true)} />
          ) : (
            <View style={styles.addMed}>
              <AppText variant="labelMd">Nouveau traitement</AppText>
              <TextInput style={[inputStyle, styles.inputOnLow]} value={newMedName} onChangeText={setNewMedName} placeholder="Nom (ex : Zinc...)" placeholderTextColor={Palette.textMuted} />
              <TextInput style={[inputStyle, styles.inputOnLow]} value={newMedDosage} onChangeText={setNewMedDosage} placeholder="Dosage habituel (ex : 1 gélule)" placeholderTextColor={Palette.textMuted} />
              <View style={styles.addMedActions}>
                <PillButton label="Annuler" variant="ghost" compact onPress={() => setShowAddMed(false)} style={{ flex: 1 }} />
                <PillButton label="Ajouter" variant="lime" icon={Check} compact onPress={handleAddMed} loading={saving} disabled={saving} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </Card>

        {/* ── Export Excel ── */}
        <Card style={{ gap: 18 }}>
          <SectionHeader icon={FileSpreadsheet} iconBg={Palette.limeSoft} iconColor={Palette.primary} title="Exporter mes données" subtitle="Partage avec ton médecin" />
          <View style={{ gap: 10 }}>
            <AppText variant="labelMd">Période</AppText>
            <View style={styles.wrap}>
              {([['7d', '7 jours'], ['30d', '30 jours'], ['90d', '3 mois'], ['all', 'Tout']] as const).map(([id, label]) => (
                <Chip key={id} label={label} selected={datePreset === id} onPress={() => setDatePreset(id as DatePreset)} style={styles.flatChip} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <AppText variant="labelMd">Données à inclure</AppText>
            <ToggleRow icon={Activity} title="Anxiété, boule gorge & disputes" value={includeSymptoms} onValueChange={setIncludeSymptoms} />
            <ToggleRow icon={Sparkles} title="Cheveux, lavages & coupes" value={includeHairCare} onValueChange={setIncludeHairCare} />
            <ToggleRow icon={Pill} title="Compléments pris & dosages" value={includeMedications} onValueChange={setIncludeMedications} />
            <ToggleRow icon={Droplet} title="Cycle menstruel" value={includeCycle} onValueChange={setIncludeCycle} />
            <ToggleRow icon={FlaskConical} title="Bilans de prises de sang" value={includeLabTests} onValueChange={setIncludeLabTests} />
            <ToggleRow icon={SlidersHorizontal} title="Normes fonctionnelles" value={includeLabNorms} onValueChange={setIncludeLabNorms} />
          </View>
          <PillButton label="Générer et partager le fichier" icon={Share2} loading={exporting} onPress={handleGenerateExcel} />
        </Card>

        {/* ── Compte ── */}
        {user && (
          <Card style={{ gap: 14 }}>
            <SectionHeader icon={User} iconBg={Palette.containerLow} iconColor={Palette.textVariant} title="Mon compte" subtitle="Synchronisation automatique" />
            <View style={styles.userPill}>
              <CircleCheck size={16} color={Palette.primary} />
              <AppText variant="bodyMd" color={Palette.text} numberOfLines={1} style={{ flex: 1 }}>{user.email}</AppText>
            </View>
            <PillButton label="Se déconnecter" icon={LogOut} variant="coral" compact onPress={handleLogout} />
          </Card>
        )}
      </ScrollView>

      {/* ── Modal Plan ── */}
      <Modal visible={showPlanModal} animationType="slide" transparent onRequestClose={() => setShowPlanModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPlanModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <View style={styles.inlineLg}>
                <IconCircle icon={Clock} size={40} bg={Palette.limeSoft} color={Palette.primary} />
                <View style={{ flexShrink: 1 }}>
                  <AppText variant="headlineSm">{editingPlan ? 'Modifier le plan' : 'Nouveau plan'}</AppText>
                  <AppText variant="bodySm" color={Palette.textMuted}>Traitement de fond ou cure ponctuelle</AppText>
                </View>
              </View>
              <Pressable onPress={() => setShowPlanModal(false)} style={styles.closeBtn} hitSlop={6}>
                <X size={18} color={Palette.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <Segmented
                options={[{ id: 'fond', label: 'Traitement de fond' }, { id: 'cure', label: 'Cure ponctuelle' }]}
                value={planType}
                onChange={(v) => setPlanType(v as TreatmentType)}
              />
              <Field label="Titre">
                <TextInput style={inputStyle} value={planName} onChangeText={setPlanName} placeholder="Ex : Cure de fer" placeholderTextColor={Palette.textMuted} />
              </Field>
              <Field label="Description (optionnel)">
                <TextInput style={[inputStyle, { height: 72, borderRadius: Radius.lg, paddingTop: 12, textAlignVertical: 'top' }]} multiline value={planDescription} onChangeText={setPlanDescription} placeholder="Objectif de la cure..." placeholderTextColor={Palette.textMuted} />
              </Field>
              <Field label="Dosage">
                <TextInput style={inputStyle} value={planDosage} onChangeText={setPlanDosage} placeholder="Ex : 48 mg par jour" placeholderTextColor={Palette.textMuted} />
              </Field>
              <Field label="Date de début">
                <Pressable onPress={() => setShowStartPicker((v) => !v)} style={[styles.dateField, showStartPicker && styles.dateFieldActive]}>
                  <AppText variant="bodyLg">{frDate(planStartDate)}</AppText>
                  <CalendarDays size={18} color={showStartPicker ? Palette.primary : Palette.textMuted} />
                </Pressable>
              </Field>
              {showStartPicker && (
                <View style={styles.datePicker}>
                  <Calendar current={planStartDate} firstDay={1} enableSwipeMonths onDayPress={(day: { dateString: string }) => { setPlanStartDate(day.dateString); setShowStartPicker(false); }} markedDates={{ [planStartDate]: { selected: true } }} theme={calTheme} />
                </View>
              )}
              {planType === 'cure' && (
                <>
                  <Field label="Date de fin">
                    <Pressable onPress={() => setShowEndPicker((v) => !v)} style={[styles.dateField, showEndPicker && styles.dateFieldActive]}>
                      <AppText variant="bodyLg">{planEndDate ? frDate(planEndDate) : 'Choisir...'}</AppText>
                      <CalendarDays size={18} color={showEndPicker ? Palette.primary : Palette.textMuted} />
                    </Pressable>
                  </Field>
                  {showEndPicker && (
                    <View style={styles.datePicker}>
                      <Calendar current={planEndDate || planStartDate} firstDay={1} enableSwipeMonths minDate={planStartDate} onDayPress={(day: { dateString: string }) => { setPlanEndDate(day.dateString); setShowEndPicker(false); }} markedDates={planEndDate ? { [planEndDate]: { selected: true } } : {}} theme={calTheme} />
                    </View>
                  )}
                </>
              )}

              {/* Prise de sang optionnelle */}
              <View style={styles.bloodSection}>
                <View style={styles.inlineLg}>
                  <Syringe size={18} color={Palette.textMuted} />
                  <AppText variant="labelMd">Prise de sang associée (optionnel)</AppText>
                </View>
                <Field label="Date de la prise de sang">
                  <Pressable onPress={() => setShowBloodPicker((v) => !v)} style={[styles.dateField, showBloodPicker && styles.dateFieldActive]}>
                    <AppText variant="bodyLg">{planBloodTestDate ? frDate(planBloodTestDate) : 'Aucune'}</AppText>
                    <CalendarDays size={18} color={showBloodPicker ? Palette.primary : Palette.textMuted} />
                  </Pressable>
                </Field>
                {showBloodPicker && (
                  <View style={styles.datePicker}>
                    <Calendar current={planBloodTestDate || planStartDate} firstDay={1} enableSwipeMonths onDayPress={(day: { dateString: string }) => { setPlanBloodTestDate(day.dateString); setShowBloodPicker(false); }} markedDates={planBloodTestDate ? { [planBloodTestDate]: { selected: true } } : {}} theme={calTheme} />
                  </View>
                )}
                {planBloodTestDate ? (
                  <View style={{ gap: 6 }}>
                    <AppText variant="labelSm" color={Palette.textMuted}>Examens à réaliser</AppText>
                    <View style={styles.wrap}>
                      {labMarkers.map((m) => (
                        <Chip key={m.id} label={m.name} selected={planBloodMarkers.includes(m.code)} onPress={() => toggleBloodMarker(m.code)} style={styles.flatChip} />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PillButton label="Annuler" variant="ghost" onPress={() => setShowPlanModal(false)} style={{ flex: 1 }} />
                <PillButton label="Enregistrer" icon={Check} onPress={handleSavePlan} loading={saving} disabled={saving} style={{ flex: 1.4 }} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function PlanRow({ plan, onEdit, onDelete, onToggle }: { plan: TreatmentPlan; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const isFond = plan.type === 'fond';
  return (
    <View style={[styles.planRow, !plan.isActive && { opacity: 0.5 }]}>
      <IconCircle icon={isFond ? Repeat : Clock} size={40} bg={isFond ? Palette.limeSoft : Palette.containerLow} color={isFond ? Palette.primary : Palette.textVariant} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="labelMd">{plan.name}</AppText>
        <AppText variant="bodySm" color={Palette.textMuted}>
          {plan.dosage}{plan.endDate ? ` · jusqu'au ${frDate(plan.endDate)}` : ' · continu'}
        </AppText>
        {plan.plannedBloodTest && (
          <AppText variant="bodySm" color={Palette.coralDeep}>
            Prise de sang le {frDate(plan.plannedBloodTest.date)}
          </AppText>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Toggle value={plan.isActive} onValueChange={onToggle} />
        <Pressable onPress={onEdit} hitSlop={6} style={styles.roundBtn}><SlidersHorizontal size={14} color={Palette.text} /></Pressable>
        <Pressable onPress={onDelete} hitSlop={6} style={styles.deleteBtn}><Trash2 size={14} color={Palette.coralDeep} /></Pressable>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="labelSm" color={Palette.textVariant} style={{ paddingLeft: 8 }}>{label}</AppText>
      {children}
    </View>
  );
}

const calTheme = {
  calendarBackground: 'transparent',
  textSectionTitleColor: Palette.textMuted,
  arrowColor: Palette.obsidian,
  monthTextColor: Palette.text,
  dayTextColor: Palette.text,
  textDisabledColor: Palette.outlineVariant,
  todayTextColor: Palette.primary,
  selectedDayBackgroundColor: Palette.obsidian,
  selectedDayTextColor: '#FFFFFF',
  textMonthFontFamily: Type.headlineSm.fontFamily,
  textDayFontFamily: Type.labelMd.fontFamily,
  textDayHeaderFontFamily: Type.labelSm.fontFamily,
  textMonthFontSize: 16,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flatChip: { backgroundColor: Palette.containerLow, shadowOpacity: 0, elevation: 0 },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.lg,
    padding: 12,
  },
  medActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  precheckedToggle: { alignItems: 'center', gap: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dosageInput: { flex: 1, height: 38, fontSize: 13 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMed: { gap: 10, backgroundColor: Palette.containerLow, borderRadius: Radius.lg, padding: 14 },
  inputOnLow: { backgroundColor: Palette.card },
  addMedActions: { flexDirection: 'row', gap: 8 },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.lg,
    padding: 12,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(18,22,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.margin,
    paddingTop: 10,
    gap: 16,
    maxHeight: '90%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: Palette.containerHighest },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inlineLg: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Palette.containerLow,
    paddingHorizontal: 20,
  },
  dateFieldActive: { borderWidth: 1.5, borderColor: Palette.lime },
  datePicker: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: 8 },
  bloodSection: { gap: 10, backgroundColor: Palette.containerLow, borderRadius: Radius.lg, padding: 14 },
});

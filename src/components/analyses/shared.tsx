import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { CalendarDays, ChevronLeft, SlidersHorizontal, X, type LucideIcon } from 'lucide-react-native';
import { LabMarkerDefinition } from '../../types';
import { Palette, Spacing, DockClearance, Radius, Type } from '../../constants/theme';
import { AppText, IconCircle, type BadgeTone } from '../ui';
import { MONTHS, frDate, todayIso } from '../../lib/dates';
import { LabStatus } from '../../lib/labStatus';
import '../../lib/calendarLocale';

export const STATUS_BADGE: Record<LabStatus, { label: string; tone: BadgeTone }> = {
  ok: { label: 'Optimal', tone: 'limeSoft' },
  low: { label: 'Trop bas', tone: 'coralSoft' },
  high: { label: 'Trop haut', tone: 'amber' },
  none: { label: 'Sans valeur', tone: 'neutral' },
};

/** Jauge horizontale : zone basse / zone optimale / zone haute + curseur. */
export function RangeTrack({ value, m }: { value?: number; m: LabMarkerDefinition }) {
  const span = Math.max(m.maxFunctional - m.minFunctional, 0.0001);
  const lo = Math.max(0, m.minFunctional - span * 0.8);
  const hi = m.maxFunctional + span * 0.8;
  const pct = (x: number) => ((Math.min(Math.max(x, lo), hi) - lo) / (hi - lo)) * 100;
  const minPct = pct(m.minFunctional);
  const maxPct = pct(m.maxFunctional);
  const fmt = (x: number) => String(Math.round(x * 10) / 10);

  return (
    <View style={{ gap: 8 }}>
      <View style={sharedStyles.track}>
        <View style={[sharedStyles.zone, { left: 0, width: `${minPct}%`, backgroundColor: Palette.coralSoft }]} />
        <View
          style={[sharedStyles.zone, { left: `${minPct}%`, width: `${maxPct - minPct}%`, backgroundColor: Palette.lime }]}
        />
        <View style={[sharedStyles.zone, { left: `${maxPct}%`, right: 0, backgroundColor: Palette.amberSoft }]} />
        {value !== undefined && <View style={[sharedStyles.needle, { left: `${pct(value)}%` }]} />}
      </View>
      <View style={sharedStyles.rowBetween}>
        <AppText variant="labelSm" color={Palette.textMuted}>
          {fmt(lo)}
        </AppText>
        <AppText variant="labelSm" color={Palette.primary}>
          Idéal : {m.minFunctional} – {m.maxFunctional}
        </AppText>
        <AppText variant="labelSm" color={Palette.textMuted}>
          {fmt(hi)}
        </AppText>
      </View>
    </View>
  );
}

export function Field({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <AppText variant="labelSm" color={Palette.textVariant} style={{ paddingLeft: 8 }}>
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="bodySm" color={Palette.coralDeep} style={{ paddingLeft: 8 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon = SlidersHorizontal,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={sharedStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={sharedStyles.sheet}>
          <View style={sharedStyles.grabber} />
          <View style={sharedStyles.rowBetween}>
            <View style={sharedStyles.inlineLg}>
              <IconCircle icon={icon} size={40} bg={Palette.limeSoft} color={Palette.primary} />
              <View style={{ flexShrink: 1 }}>
                <AppText variant="headlineSm">{title}</AppText>
                {subtitle ? (
                  <AppText variant="bodySm" color={Palette.textMuted}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
            </View>
            <Pressable onPress={onClose} style={sharedStyles.roundBtn} hitSlop={6}>
              <X size={18} color={Palette.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type PickerStep = 'year' | 'month' | 'day';

/**
 * Champ date avec sélecteur année → mois → jour.
 * `mode="past"` : jusqu'à aujourd'hui ; `mode="future"` : à partir d'aujourd'hui.
 */
export function DateField({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  mode: 'past' | 'future';
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>('year');
  const [year, setYear] = useState(parseInt(value.slice(0, 4), 10));
  const [month, setMonth] = useState(parseInt(value.slice(5, 7), 10) - 1);

  const today = todayIso();
  const currentYear = parseInt(today.slice(0, 4), 10);
  const currentMonth = parseInt(today.slice(5, 7), 10) - 1;
  const years =
    mode === 'past'
      ? Array.from({ length: 10 }, (_, i) => currentYear - 9 + i)
      : Array.from({ length: 3 }, (_, i) => currentYear + i);

  const toggle = () => {
    if (!open) {
      setYear(parseInt(value.slice(0, 4), 10));
      setMonth(parseInt(value.slice(5, 7), 10) - 1);
      setStep('year');
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <Field label={label}>
        <Pressable onPress={toggle} style={[sharedStyles.dateField, open && sharedStyles.dateFieldActive]}>
          <AppText variant="bodyLg">{frDate(value)}</AppText>
          <CalendarDays size={18} color={open ? Palette.primary : Palette.textMuted} />
        </Pressable>
      </Field>
      {open && (
        <View style={sharedStyles.datePicker}>
          {step === 'year' && (
            <>
              <AppText variant="headlineSm" style={{ textAlign: 'center', marginBottom: 12 }}>
                {"Choisir l'année"}
              </AppText>
              <View style={sharedStyles.pickerGrid}>
                {years.map((yr) => (
                  <Pressable
                    key={yr}
                    onPress={() => {
                      setYear(yr);
                      setStep('month');
                    }}
                    style={[sharedStyles.pickerCell, yr === year && sharedStyles.pickerCellSelected]}>
                    <AppText variant="labelMd" style={yr === year ? { color: '#FFF' } : undefined}>
                      {yr}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {step === 'month' && (
            <>
              <Pressable onPress={() => setStep('year')} style={sharedStyles.pickerBack}>
                <ChevronLeft size={18} color={Palette.primary} />
                <AppText variant="headlineSm" color={Palette.primary}>
                  {year}
                </AppText>
              </Pressable>
              <View style={sharedStyles.pickerGrid}>
                {MONTHS.map((name, i) => {
                  const disabled =
                    year === currentYear && (mode === 'past' ? i > currentMonth : i < currentMonth);
                  return (
                    <Pressable
                      key={i}
                      disabled={disabled}
                      onPress={() => {
                        setMonth(i);
                        setStep('day');
                      }}
                      style={[
                        sharedStyles.pickerCell,
                        i === month && sharedStyles.pickerCellSelected,
                        disabled && { opacity: 0.3 },
                      ]}>
                      <AppText
                        variant="labelMd"
                        style={i === month ? { color: '#FFF' } : disabled ? { color: Palette.textMuted } : undefined}>
                        {name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          {step === 'day' && (
            <>
              <Pressable onPress={() => setStep('month')} style={sharedStyles.pickerBack}>
                <ChevronLeft size={18} color={Palette.primary} />
                <AppText variant="headlineSm" color={Palette.primary}>
                  {MONTHS[month]} {year}
                </AppText>
              </Pressable>
              <Calendar
                key={`${year}-${month}`}
                current={`${year}-${String(month + 1).padStart(2, '0')}-01`}
                {...(mode === 'past' ? { maxDate: today } : { minDate: today })}
                firstDay={1}
                hideArrows
                onDayPress={(day: { dateString: string }) => {
                  onChange(day.dateString);
                  setOpen(false);
                }}
                markedDates={{ [value]: { selected: true } }}
                theme={{
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
                }}
              />
            </>
          )}
        </View>
      )}
    </>
  );
}

/** Bouton pointillé « + Ajouter … » en bas de liste. */
export function AddRow({ label, icon: Icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.addRow, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={sharedStyles.addIcon}>
        <Icon size={18} color={Palette.obsidian} strokeWidth={2.6} />
      </View>
      <AppText variant="labelMd">{label}</AppText>
    </Pressable>
  );
}

export const sharedStyles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 8,
    paddingBottom: DockClearance,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowBetweenTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  inlineLg: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  rowFields: { flexDirection: 'row', gap: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.outlineVariant,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiline: { height: 88, borderRadius: Radius.lg, paddingTop: 14, textAlignVertical: 'top' },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.container,
  },
  cardFooter: { borderTopWidth: 1, borderTopColor: Palette.container, paddingTop: 12 },
  track: { height: 12, borderRadius: 6, overflow: 'visible', backgroundColor: Palette.container },
  zone: { position: 'absolute', top: 0, bottom: 0, borderRadius: 6 },
  needle: {
    position: 'absolute',
    top: -5,
    width: 6,
    height: 22,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: Palette.obsidian,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
  datePicker: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: 12 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerCell: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Palette.containerLow,
  },
  pickerCellSelected: { backgroundColor: Palette.obsidian },
  pickerBack: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: Palette.containerLow,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

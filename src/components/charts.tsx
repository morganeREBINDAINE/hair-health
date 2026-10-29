import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Polyline, Circle, Line, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { Palette } from '../constants/theme';
import { AppText } from './ui';

// Graphiques légers en SVG (react-native-gifted-charts plante sur le web).

/** Barres pilule verticales — une par point, en rouge les jours de règles, avec légende optionnelle. */
export function PillBarChart({
  data,
  height = 150,
  legend,
}: {
  data: { value: number; label: string; menstrual?: boolean }[];
  height?: number;
  legend?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.bars, { height: height + 40 }]}>
        {data.map((d, i) => {
          const h = Math.max(18, (d.value / max) * height);
          return (
            <View key={`${d.label}-${i}`} style={styles.barCol}>
              <AppText variant="labelSm" color={d.menstrual ? Palette.menstrualDeep : Palette.textVariant}>
                {d.value}
              </AppText>
              <View
                style={[styles.bar, { height: h, backgroundColor: d.menstrual ? Palette.menstrual : Palette.lime }]}
              />
              <AppText variant="labelSm" color={Palette.textMuted} style={{ fontSize: 9 }}>
                {d.label}
              </AppText>
            </View>
          );
        })}
      </View>
      {legend && (
        <View style={styles.legend}>
          <LegendItem color={Palette.lime} label="Jour normal" />
          <LegendItem color={Palette.menstrual} label="Jour de règles" />
        </View>
      )}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="labelSm" color={Palette.textVariant}>
        {label}
      </AppText>
    </View>
  );
}

/** Courbe avec bande de zone cible (min–max). */
export function TargetLineChart({
  data,
  width,
  height = 150,
  min,
  max,
  maxValue,
}: {
  data: { value: number; label: string }[];
  width: number;
  height?: number;
  min: number;
  max: number;
  maxValue: number;
}) {
  const top = Math.max(maxValue, ...data.map((d) => d.value)) * 1.05;
  const padX = 14;
  const innerW = Math.max(width - padX * 2, 1);
  const y = (v: number) => height - (v / top) * height;
  const x = (i: number) => padX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const area = data.length > 1 ? `${x(0)},${height} ${pts} ${x(data.length - 1)},${height}` : '';

  return (
    <View style={{ gap: 6 }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Palette.lime} stopOpacity={0.35} />
            <Stop offset="1" stopColor={Palette.lime} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={y(max)} width={width} height={y(min) - y(max)} fill={Palette.limeSoft} rx={8} />
        <Line x1={0} x2={width} y1={y(min)} y2={y(min)} stroke={Palette.limeDim} strokeDasharray="4 4" />
        <Line x1={0} x2={width} y1={y(max)} y2={y(max)} stroke={Palette.limeDim} strokeDasharray="4 4" />
        {area ? <Polygon points={area} fill="url(#area)" /> : null}
        {data.length > 1 && (
          <Polyline points={pts} fill="none" stroke={Palette.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {data.map((d, i) => {
          const ok = d.value >= min && d.value <= max;
          return (
            <Circle
              key={i}
              cx={x(i)}
              cy={y(d.value)}
              r={5}
              fill={ok ? Palette.obsidian : Palette.coral}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          );
        })}
      </Svg>
      <View style={[styles.axis, { width }]}>
        {data.map((d, i) => (
          <AppText key={i} variant="labelSm" color={Palette.textMuted} style={{ fontSize: 9 }}>
            {d.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

/**
 * Évolution dans le temps : abscisse proportionnelle aux dates (et non à l'index),
 * bande de zone cible, graduations Y et repères de dates sur l'axe X.
 */
export function TimeSeriesChart({
  points,
  width,
  height = 200,
  min,
  max,
  fromIso,
  toIso,
}: {
  points: { date: string; value: number }[];
  width: number;
  height?: number;
  min: number;
  max: number;
  fromIso: string;
  toIso: string;
}) {
  const t = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
  const values = points.map((p) => p.value);
  const rawLo = Math.min(min, ...values);
  const rawHi = Math.max(max, ...values);
  const pad = Math.max((rawHi - rawLo) * 0.15, 0.5);
  const lo = Math.max(0, rawLo - pad);
  const hi = rawHi + pad;

  const axisW = 34;
  const padR = 10;
  const padY = 10;
  const innerW = Math.max(width - axisW - padR, 1);
  const innerH = height - padY * 2;
  const t0 = t(fromIso);
  const t1 = Math.max(t(toIso), t0 + 1);
  const x = (iso: string) => axisW + ((t(iso) - t0) / (t1 - t0)) * innerW;
  const y = (v: number) => padY + innerH - ((v - lo) / (hi - lo)) * innerH;

  const fmt = (v: number) => String(Math.round(v * 10) / 10);
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  const pts = points.map((p) => `${x(p.date)},${y(p.value)}`).join(' ');
  const area =
    points.length > 1
      ? `${x(points[0].date)},${padY + innerH} ${pts} ${x(points[points.length - 1].date)},${padY + innerH}`
      : '';

  // 4 repères de dates répartis sur la période
  const dateTicks = [0, 1 / 3, 2 / 3, 1].map((f) => new Date(t0 + (t1 - t0) * f).toISOString().slice(0, 10));
  const tickLabel = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

  return (
    <View style={{ gap: 6 }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="tsArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Palette.lime} stopOpacity={0.35} />
            <Stop offset="1" stopColor={Palette.lime} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        {ticks.map((v, i) => (
          <Line key={i} x1={axisW} x2={width - padR} y1={y(v)} y2={y(v)} stroke={Palette.container} />
        ))}
        <Rect x={axisW} y={y(max)} width={innerW} height={Math.max(y(min) - y(max), 1)} fill={Palette.limeSoft} rx={6} />
        <Line x1={axisW} x2={width - padR} y1={y(min)} y2={y(min)} stroke={Palette.limeDim} strokeDasharray="4 4" />
        <Line x1={axisW} x2={width - padR} y1={y(max)} y2={y(max)} stroke={Palette.limeDim} strokeDasharray="4 4" />
        {area ? <Polygon points={area} fill="url(#tsArea)" /> : null}
        {points.length > 1 && (
          <Polyline points={pts} fill="none" stroke={Palette.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((p, i) => {
          const ok = p.value >= min && p.value <= max;
          return (
            <Circle
              key={i}
              cx={x(p.date)}
              cy={y(p.value)}
              r={5.5}
              fill={ok ? Palette.obsidian : Palette.coral}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          );
        })}
      </Svg>
      {ticks.map((v, i) => (
        <AppText
          key={i}
          variant="labelSm"
          color={Palette.textMuted}
          style={[styles.yTick, { top: y(v) - 7, width: axisW - 6 }]}>
          {fmt(v)}
        </AppText>
      ))}
      <View style={[styles.axis, { width, paddingLeft: axisW - 20, paddingRight: Math.max(padR - 20, 0) }]}>
        {dateTicks.map((iso, i) => (
          <AppText key={i} variant="labelSm" color={Palette.textMuted} style={{ fontSize: 10, width: 40, textAlign: 'center' }}>
            {tickLabel(iso)}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yTick: { position: 'absolute', left: 0, fontSize: 10, textAlign: 'right' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barCol: { alignItems: 'center', gap: 6, flex: 1 },
  bar: { width: 18, borderRadius: 9 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});

import React, { useMemo } from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { OfflineRouteMode } from '../../types/soloRun';
import { useTheme } from '../../context/ThemeContext';

interface OfflineSyntheticMapProps {
  currentDistanceKm: number;
  targetDistanceKm: number;
  routeMode: OfflineRouteMode;
  style?: StyleProp<ViewStyle>;
}

export const OfflineSyntheticMap: React.FC<OfflineSyntheticMapProps> = ({
  currentDistanceKm,
  targetDistanceKm,
  routeMode,
  style,
}) => {
  const { colors } = useTheme();

  // Progress fraction (0.0 to 1.0+)
  const progressFraction = useMemo(() => {
    if (!targetDistanceKm || targetDistanceKm <= 0) return 0;
    return Math.min(1.0, Math.max(0, currentDistanceKm / targetDistanceKm));
  }, [currentDistanceKm, targetDistanceKm]);

  const percentText = useMemo(() => {
    return `${Math.round(progressFraction * 100)}%`;
  }, [progressFraction]);

  // Compute runner position along the synthetic vector track
  // SVG ViewBox: 340 x 200
  const runnerPosition = useMemo(() => {
    if (routeMode === 'LOOP') {
      // Oval Track Geometry: Center (170, 100), Rx = 110, Ry = 60
      // Start at top center: Angle -90 deg (-PI/2), moving clockwise
      const startAngle = -Math.PI / 2;
      const angle = startAngle + progressFraction * 2 * Math.PI;
      const cx = 170;
      const cy = 100;
      const rx = 110;
      const ry = 58;

      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);
      return { x, y };
    } else {
      // STRAIGHT Track Geometry: From (40, 100) to (300, 100)
      const startX = 40;
      const endX = 300;
      const y = 100;
      const x = startX + progressFraction * (endX - startX);
      return { x, y };
    }
  }, [routeMode, progressFraction]);

  // Milestones formatting
  const milestones = useMemo(() => {
    const target = targetDistanceKm || 1;
    if (routeMode === 'LOOP') {
      return [
        { label: 'START', pos: { x: 170, y: 32 } },
        { label: `${(target * 0.25).toFixed(1)}k`, pos: { x: 290, y: 104 } },
        { label: `${(target * 0.5).toFixed(1)}k`, pos: { x: 170, y: 172 } },
        { label: `${(target * 0.75).toFixed(1)}k`, pos: { x: 50, y: 104 } },
      ];
    } else {
      return [
        { label: '0k', pos: { x: 40, y: 124 } },
        { label: `${(target * 0.33).toFixed(1)}k`, pos: { x: 126, y: 124 } },
        { label: `${(target * 0.66).toFixed(1)}k`, pos: { x: 213, y: 124 } },
        { label: `${target.toFixed(1)}k`, pos: { x: 300, y: 124 } },
      ];
    }
  }, [routeMode, targetDistanceKm]);

  return (
    <View style={[styles.container, { borderColor: colors.primary, shadowColor: colors.primary }, style]}>
      {/* Top Header Tag */}
      <View style={styles.topTagRow}>
        <View style={[styles.modeBadge, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
          <Text style={[styles.modeBadgeText, { color: colors.primary }]}>
            OFFLINE {routeMode} TRACK ({targetDistanceKm} KM)
          </Text>
        </View>
        <Text style={[styles.progressText, { color: colors.primary }]}>
          {percentText} COMPLETED
        </Text>
      </View>

      {/* Synthetic Vector Track SVG Canvas */}
      <Svg width="100%" height="180" viewBox="0 0 340 200" style={styles.svgCanvas}>
        <Defs>
          <LinearGradient id="neonGlowGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.primaryBright || colors.primary} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Grid Lines Pattern Background */}
        <Line x1="0" y1="50" x2="340" y2="50" stroke="#16161D" strokeWidth="1" strokeDasharray="4 4" />
        <Line x1="0" y1="100" x2="340" y2="100" stroke="#1C1C24" strokeWidth="1" strokeDasharray="4 4" />
        <Line x1="0" y1="150" x2="340" y2="150" stroke="#16161D" strokeWidth="1" strokeDasharray="4 4" />
        <Line x1="85" y1="0" x2="85" y2="200" stroke="#16161D" strokeWidth="1" strokeDasharray="4 4" />
        <Line x1="170" y1="0" x2="170" y2="200" stroke="#1C1C24" strokeWidth="1" strokeDasharray="4 4" />
        <Line x1="255" y1="0" x2="255" y2="200" stroke="#16161D" strokeWidth="1" strokeDasharray="4 4" />

        {/* LOOP MODE VECTOR ROUTE */}
        {routeMode === 'LOOP' ? (
          <>
            {/* Outer Track Guide */}
            <Rect x="50" y="32" width="240" height="136" rx="68" fill="none" stroke="#242430" strokeWidth="12" />
            {/* Inner Dark Asphalt Lane */}
            <Rect x="54" y="36" width="232" height="128" rx="64" fill="#0A0A0E" stroke="#121218" strokeWidth="2" />
            {/* Base Dashed Target Polyline */}
            <Rect x="60" y="42" width="220" height="116" rx="58" fill="none" stroke="#333344" strokeWidth="4" strokeDasharray="6 4" />
            {/* Completed Progress Neon Polyline */}
            <Rect
              x="60"
              y="42"
              width="220"
              height="116"
              rx="58"
              fill="none"
              stroke="url(#neonGlowGrad)"
              strokeWidth="5"
              strokeDasharray={`${progressFraction * 620} 620`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Start / Finish Checkered Gate Line */}
            <Line x1="170" y1="36" x2="170" y2="48" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="2 2" />
          </>
        ) : null}

        {/* STRAIGHT MODE VECTOR ROUTE */}
        {routeMode === 'STRAIGHT' ? (
          <>
            {/* Outer Track Lane */}
            <Rect x="30" y="86" width="280" height="28" rx="14" fill="#0A0A0E" stroke="#242430" strokeWidth="2" />
            {/* Base Dashed Target Line */}
            <Line x1="40" y1="100" x2="300" y2="100" stroke="#333344" strokeWidth="4" strokeDasharray="8 6" />
            {/* Completed Progress Neon Line */}
            <Line
              x1="40"
              y1="100"
              x2={`${40 + progressFraction * 260}`}
              y2="100"
              stroke="url(#neonGlowGrad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Finish Line Flag Marker */}
            <Line x1="300" y1="84" x2="300" y2="116" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="3 3" />
          </>
        ) : null}

        {/* Milestone Labels */}
        {milestones.map((m, idx) => (
          <SvgText
            key={idx}
            x={m.pos.x}
            y={m.pos.y}
            fill="#8E8E93"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {m.label}
          </SvgText>
        ))}

        {/* Live Glowing Neon Runner Marker */}
        <Circle cx={runnerPosition.x} cy={runnerPosition.y} r="12" fill={colors.glow || 'rgba(168, 255, 0, 0.4)'} />
        <Circle cx={runnerPosition.x} cy={runnerPosition.y} r="6" fill="#050505" stroke={colors.primary} strokeWidth="2" />
        <Circle cx={runnerPosition.x} cy={runnerPosition.y} r="3" fill={colors.primary} />
      </Svg>

      {/* Progress Bar Footer */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, Math.round(progressFraction * 100))}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#050505',
    padding: 12,
    overflow: 'hidden',
  },
  topTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  svgCanvas: {
    marginVertical: 4,
  },
  progressBarBg: {
    height: 4,
    width: '100%',
    backgroundColor: '#1C1C24',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

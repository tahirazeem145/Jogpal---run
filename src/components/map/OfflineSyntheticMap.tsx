import React, { useMemo } from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { OfflineRouteMode } from '../../types/soloRun';
import { useTheme } from '../../context/ThemeContext';

interface OfflineSyntheticMapProps {
  currentDistanceKm: number;
  targetDistanceKm: number;
  routeMode: OfflineRouteMode;
  style?: StyleProp<ViewStyle>;
}

// Stadium track constants for SVG ViewBox: 340 x 200
const R = 58;
const CX_LEFT = 118;
const CX_RIGHT = 222;
const Y_TOP = 42;
const Y_BOTTOM = 158;
const Y_CENTER = 100;
const SEG_TOP_HALF = 52; // 170 to 222
const SEG_ARC = R * Math.PI; // ~182.212
const SEG_BOTTOM = 104; // 222 to 118
const TRACK_PERIMETER = 2 * SEG_BOTTOM + 2 * SEG_ARC; // ~572.425

// Base stadium SVG path starting at top center (170, 42) moving clockwise
const LOOP_TRACK_PATH = `M 170 ${Y_TOP} L ${CX_RIGHT} ${Y_TOP} A ${R} ${R} 0 0 1 ${CX_RIGHT} ${Y_BOTTOM} L ${CX_LEFT} ${Y_BOTTOM} A ${R} ${R} 0 0 1 ${CX_LEFT} ${Y_TOP} Z`;

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

  const isCompleted = progressFraction >= 1.0;

  // Compute runner position along the synthetic vector track
  // Exactly matching the SVG vector line
  const runnerPosition = useMemo(() => {
    if (routeMode === 'LOOP') {
      const d = progressFraction * TRACK_PERIMETER;

      // Segment 1: Top right straight (170 -> 222)
      if (d <= SEG_TOP_HALF) {
        return { x: 170 + d, y: Y_TOP };
      }

      // Segment 2: Right semicircle (222, 42) -> (222, 158)
      const d2 = d - SEG_TOP_HALF;
      if (d2 <= SEG_ARC) {
        const theta = -Math.PI / 2 + d2 / R;
        return {
          x: CX_RIGHT + R * Math.cos(theta),
          y: Y_CENTER + R * Math.sin(theta),
        };
      }

      // Segment 3: Bottom straight (222 -> 118)
      const d3 = d2 - SEG_ARC;
      if (d3 <= SEG_BOTTOM) {
        return { x: CX_RIGHT - d3, y: Y_BOTTOM };
      }

      // Segment 4: Left semicircle (118, 158) -> (118, 42)
      const d4 = d3 - SEG_BOTTOM;
      if (d4 <= SEG_ARC) {
        const theta = Math.PI / 2 + d4 / R;
        return {
          x: CX_LEFT + R * Math.cos(theta),
          y: Y_CENTER + R * Math.sin(theta),
        };
      }

      // Segment 5: Top left straight (118 -> 170)
      const d5 = d4 - SEG_ARC;
      return { x: Math.min(170, CX_LEFT + d5), y: Y_TOP };
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
        { label: 'START', pos: { x: 170, y: 28 } },
        { label: `${(target * 0.25).toFixed(1)}k`, pos: { x: 298, y: 104 } },
        { label: `${(target * 0.5).toFixed(1)}k`, pos: { x: 170, y: 178 } },
        { label: `${(target * 0.75).toFixed(1)}k`, pos: { x: 42, y: 104 } },
      ];
    } else {
      return [
        { label: '0k', pos: { x: 40, y: 126 } },
        { label: `${(target * 0.33).toFixed(1)}k`, pos: { x: 126, y: 126 } },
        { label: `${(target * 0.66).toFixed(1)}k`, pos: { x: 213, y: 126 } },
        { label: `${target.toFixed(1)}k`, pos: { x: 300, y: 126 } },
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
        <Text style={[styles.progressText, { color: isCompleted ? '#00FF66' : colors.primary }]}>
          {isCompleted ? '★ GOAL COMPLETED' : `${percentText} COMPLETED`}
        </Text>
      </View>

      {/* Synthetic Vector Track SVG Canvas */}
      <Svg width="100%" height="180" viewBox="0 0 340 200" style={styles.svgCanvas}>
        <Defs>
          <LinearGradient id="neonGlowGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.85" />
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
        {routeMode === 'LOOP' && (
          <>
            {/* Outer Track Guide Bed */}
            <Path
              d={LOOP_TRACK_PATH}
              fill="none"
              stroke="#1A1A24"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Inner Dark Asphalt Lane */}
            <Path
              d={LOOP_TRACK_PATH}
              fill="none"
              stroke="#0A0A0E"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Base Dashed Target Polyline */}
            <Path
              d={LOOP_TRACK_PATH}
              fill="none"
              stroke="#333344"
              strokeWidth="3.5"
              strokeDasharray="6 4"
            />
            {/* Completed Progress Neon Polyline */}
            <Path
              d={LOOP_TRACK_PATH}
              fill="none"
              stroke="url(#neonGlowGrad)"
              strokeWidth="5"
              strokeDasharray={`${progressFraction * TRACK_PERIMETER} ${TRACK_PERIMETER}`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Start / Finish Checkered Gate Line at (170, 42) */}
            <Line x1="170" y1="34" x2="170" y2="50" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="2 2" />
          </>
        )}

        {/* STRAIGHT MODE VECTOR ROUTE */}
        {routeMode === 'STRAIGHT' && (
          <>
            {/* Outer Track Lane Bed */}
            <Line x1="36" y1="100" x2="304" y2="100" stroke="#1A1A24" strokeWidth="22" strokeLinecap="round" />
            <Line x1="38" y1="100" x2="302" y2="100" stroke="#0A0A0E" strokeWidth="16" strokeLinecap="round" />
            {/* Base Dashed Target Line */}
            <Line x1="40" y1="100" x2="300" y2="100" stroke="#333344" strokeWidth="3.5" strokeDasharray="8 6" />
            {/* Completed Progress Neon Line */}
            <Line
              x1="40"
              y1="100"
              x2={40 + progressFraction * 260}
              y2="100"
              stroke="url(#neonGlowGrad)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Start Gate */}
            <Circle cx="40" cy="100" r="6" fill="#00FF66" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Finish Gate */}
            <Circle cx="300" cy="100" r="6" fill="#FF3B30" stroke="#FFFFFF" strokeWidth="1.5" />
          </>
        )}

        {/* Milestone Labels */}
        {milestones.map((m, idx) => (
          <SvgText
            key={idx}
            x={m.pos.x}
            y={m.pos.y}
            fill="#8E8E93"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            {m.label}
          </SvgText>
        ))}

        {/* Live Glowing Neon Runner Marker */}
        <Circle cx={runnerPosition.x} cy={runnerPosition.y} r="13" fill={colors.glow || 'rgba(168, 255, 0, 0.35)'} />
        <Circle cx={runnerPosition.x} cy={runnerPosition.y} r="6" fill="#050505" stroke={colors.primary} strokeWidth="2" />
        <Circle cx={runnerPosition.x} cy={runnerPosition.y} r="3" fill={colors.primary} />
      </Svg>

      {/* Progress Bar Footer */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, Math.round(progressFraction * 100))}%`,
              backgroundColor: isCompleted ? '#00FF66' : colors.primary,
            },
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

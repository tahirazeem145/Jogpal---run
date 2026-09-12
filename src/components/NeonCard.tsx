import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { HoneycombPattern } from './HoneycombPattern';
import { colors } from '../theme/colors';

interface NeonCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edgeWidth?: number;
  patternOpacity?: number;
}

export const NeonCard: React.FC<NeonCardProps> = ({
  children,
  style,
  contentStyle,
  edgeWidth = 65,
  patternOpacity = 0.35,
}) => {
  return (
    <View style={[styles.card, style]}>
      {/* Honeycomb left & right edge badges with gradient fade */}
      <HoneycombPattern edgeWidth={edgeWidth} opacity={patternOpacity} />
      {/* Inner Content */}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.limePrimary,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    padding: 16,
    position: 'relative',
    zIndex: 2,
  },
});

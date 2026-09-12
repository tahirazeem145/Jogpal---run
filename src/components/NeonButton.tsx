import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { HoneycombPattern } from './HoneycombPattern';
import { colors } from '../theme/colors';

interface NeonButtonProps {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  edgeWidth?: number;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  edgeWidth = 45,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <HoneycombPattern edgeWidth={edgeWidth} opacity={0.35} />
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    backgroundColor: colors.limePrimary,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
    zIndex: 2,
  },
});

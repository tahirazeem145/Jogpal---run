import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { HoneycombPattern } from './HoneycombPattern';
import { useTheme } from '../context/ThemeContext';

interface NeonButtonProps {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  edgeWidth?: number;
  disabled?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  edgeWidth = 45,
  disabled = false,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.primary },
        disabled && styles.disabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.85}
      disabled={disabled}
    >
      <HoneycombPattern edgeWidth={edgeWidth} opacity={0.12} />
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.6,
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

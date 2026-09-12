import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/colors';

interface FloatingSparkleButtonProps {
  onPress?: () => void;
}

export const FloatingSparkleButton: React.FC<FloatingSparkleButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    zIndex: 99,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#222224',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#36363A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});

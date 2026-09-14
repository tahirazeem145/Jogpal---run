import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SOSButtonProps {
  onPress: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onPress, compact = false, style }) => {
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, style]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel="Emergency SOS Button"
        accessibilityRole="button"
      >
        <Ionicons name="warning" size={14} color="#FFFFFF" style={styles.compactIcon} />
        <Text style={styles.compactText}>SOS</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="Emergency SOS Button"
      accessibilityRole="button"
    >
      <View style={styles.innerContent}>
        <View style={styles.iconCircle}>
          <Ionicons name="warning" size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.titleText}>SOS</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DC2626',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 5,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  compactIcon: {
    marginRight: 4,
  },
  compactText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalBest } from '../types/data';
import { useTheme } from '../theme/colors';

interface PersonalBestsSectionProps {
  records?: PersonalBest[];
  onRecordPress?: (record: PersonalBest) => void;
}

export const PersonalBestsSection: React.FC<PersonalBestsSectionProps> = ({
  records = [],
  onRecordPress,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>PERSONAL BESTS</Text>
      </View>

      {/* Horizontal Cards / Empty State */}
      {records.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {records.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => onRecordPress && onRecordPress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{item.category}</Text>
                <Ionicons name="trophy-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.recordText, { color: colors.textPrimary }]}>{item.record}</Text>
              <View style={[styles.cardFooter, { borderTopColor: colors.cardBorder }]}>
                <Text style={[styles.paceText, { color: colors.primary }]}>{item.pace}</Text>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Complete your first run to establish personal records.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 170,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recordText: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 2,
  },
  paceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 10,
  },
  emptyContainer: {
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

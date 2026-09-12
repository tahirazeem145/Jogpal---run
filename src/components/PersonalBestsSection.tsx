import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalBest } from '../types/data';
import { colors } from '../theme/colors';

interface PersonalBestsSectionProps {
  records?: PersonalBest[];
  onRecordPress?: (record: PersonalBest) => void;
}

export const PersonalBestsSection: React.FC<PersonalBestsSectionProps> = ({
  records = [],
  onRecordPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>PERSONAL BESTS</Text>
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
              style={styles.card}
              onPress={() => onRecordPress && onRecordPress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.categoryText}>{item.category}</Text>
                <Ionicons name="trophy-outline" size={16} color={colors.limePrimary} />
              </View>
              <Text style={styles.recordText}>{item.record}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.paceText}>{item.pace}</Text>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
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
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 170,
    backgroundColor: '#151517',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242428',
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
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  recordText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#202022',
    paddingTop: 8,
    gap: 2,
  },
  paceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.limePrimary,
  },
  dateText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyContainer: {
    marginHorizontal: 16,
    padding: 18,
    backgroundColor: '#151517',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#242428',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

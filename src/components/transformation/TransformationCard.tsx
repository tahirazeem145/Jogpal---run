import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { TransformationMap } from '../../types/transformation';
import { transformationService } from '../../services/transformationService';
import { TransformationModal } from './TransformationModal';
import { useTheme } from '../../context/ThemeContext';

interface TransformationCardProps {
  userId: string;
  userName?: string;
}

export const TransformationCard: React.FC<TransformationCardProps> = ({
  userId,
  userName,
}) => {
  const { colors } = useTheme();

  const [photosMap, setPhotosMap] = useState<TransformationMap>({});
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    const data = await transformationService.getPhotos(userId);
    setPhotosMap(data);
  };

  const capturedCount = Object.keys(photosMap).length;
  const sortedDays = Object.keys(photosMap).map(Number).sort((a, b) => b - a);
  const latestPhoto = sortedDays.length > 0 ? photosMap[sortedDays[0]] : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.88}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
            <Ionicons name="camera" size={20} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>30-DAY TRANSFORMATION</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>{capturedCount}/30</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {capturedCount === 0
                ? 'Tap to start your 30-day transformation calendar!'
                : `Latest photo added for Day ${sortedDays[0]}. Tap to view calendar!`}
            </Text>
          </View>
        </View>

        {/* Right Preview Thumbnail or Plus Icon */}
        <View style={styles.rightBox}>
          {latestPhoto ? (
            <Image source={{ uri: latestPhoto.imageUri }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={[styles.plusBox, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
              <Feather name="plus" size={18} color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TransformationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          loadPhotos();
        }}
        userId={userId}
        userName={userName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  countText: {
    fontSize: 9,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  rightBox: {
    marginLeft: 10,
  },
  thumbImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  plusBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  userName?: string;
  avatarUrl?: string;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Runner',
  avatarUrl,
  unreadCount = 0,
  onNotificationPress,
  onProfilePress,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <Text style={[styles.greetingText, { color: colors.textSecondary }]}>HELLO,</Text>
        <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{userName}</Text>
      </View>

      <View style={styles.rightContainer}>
        {/* Notification Bell Button */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={[styles.badgeContainer, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Profile Avatar with Online Badge */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, { borderColor: colors.primary }]} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: colors.avatarBg, borderColor: colors.avatarBorder }]}>
              <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
                {userName.trim().charAt(0) || 'T'}
              </Text>
            </View>
          )}
          {/* Status Indicator Dot */}
          <View style={[styles.statusDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  leftContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  userNameText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
});

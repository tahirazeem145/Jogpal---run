import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface HeaderProps {
  userName?: string;
  avatarUrl?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Runner',
  avatarUrl,
  onNotificationPress,
  onProfilePress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <Text style={styles.greetingText}>HELLO,</Text>
        <Text style={styles.userNameText}>{userName}</Text>
      </View>

      <View style={styles.rightContainer}>
        {/* Notification Bell Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Profile Avatar with Online Badge */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userName.trim().charAt(0) || 'T'}
              </Text>
            </View>
          )}
          {/* Status Indicator Dot */}
          <View style={styles.statusDot} />
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
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  userNameText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: colors.textPrimary,
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
    backgroundColor: '#1E1E20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#38383A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#48484A',
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.limePrimary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.limePrimary,
    borderWidth: 2.5,
    borderColor: colors.background,
  },
});

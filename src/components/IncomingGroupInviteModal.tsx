import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupRunSession } from '../types/data';
import { useTheme } from '../context/ThemeContext';

interface IncomingGroupInviteModalProps {
  session: GroupRunSession | null;
  onAccept: (session: GroupRunSession) => void;
  onDecline: (session: GroupRunSession) => void;
}

export const IncomingGroupInviteModal: React.FC<IncomingGroupInviteModalProps> = ({
  session,
  onAccept,
  onDecline,
}) => {
  const { colors } = useTheme();

  if (!session) return null;

  const hostInitial = (session.hostName?.trim().charAt(0) || 'R').toUpperCase();
  const invitedList = Object.values(session.invitedFriends || {});

  return (
    <Modal
      visible={!!session}
      transparent
      animationType="fade"
      onRequestClose={() => onDecline(session)}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
            },
          ]}
        >
          {/* Top Glow Pulse Icon */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: colors.crewAddBg,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="globe" size={32} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            INCOMING SQUAD RUN INVITE
          </Text>

          {/* Host Info Box */}
          <View
            style={[
              styles.hostBox,
              {
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {session.hostAvatar ? (
              <Image source={{ uri: session.hostAvatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: colors.crewAddBg, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {hostInitial}
                </Text>
              </View>
            )}

            <View style={styles.hostDetails}>
              <Text style={[styles.hostName, { color: colors.textPrimary }]} numberOfLines={1}>
                {session.hostName}
              </Text>
              <Text style={[styles.hostSubtext, { color: colors.primary }]}>
                Invited you to a Synchronized Squad Run!
              </Text>
            </View>
          </View>

          {/* Squad Members Invited */}
          {invitedList.length > 0 && (
            <View style={styles.squadPreviewBox}>
              <Text style={[styles.squadLabel, { color: colors.textMuted }]}>SQUAD MEMBERS ({invitedList.length + 1} RUNNERS):</Text>
              <View style={styles.squadMembersRow}>
                {invitedList.slice(0, 4).map((friend) => (
                  <View key={friend.userId} style={[styles.squadMemberPill, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.squadMemberName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {friend.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Feature Highlight Pill */}
          <View style={[styles.infoPill, { backgroundColor: colors.crewAddBg, borderColor: colors.primary }]}>
            <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>
              ⚡ Live synchronized GPS map tracking for all squad members
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.declineButton, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
              onPress={() => onDecline(session)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
              <Text style={[styles.declineText, { color: colors.textSecondary }]}>DECLINE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.primary }]}
              onPress={() => onAccept(session)}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={18} color="#000000" />
              <Text style={styles.acceptText}>ACCEPT & RUN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 16,
  },
  hostBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  hostSubtext: {
    fontSize: 11,
    fontWeight: '700',
  },
  squadPreviewBox: {
    width: '100%',
    marginBottom: 14,
  },
  squadLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  squadMembersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  squadMemberPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  squadMemberName: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  declineText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  acceptButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
    elevation: 4,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
});

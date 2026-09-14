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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DuoRunSession } from '../types/data';
import { useTheme } from '../context/ThemeContext';

interface IncomingDuoInviteModalProps {
  session: DuoRunSession | null;
  onAccept: (session: DuoRunSession) => void;
  onDecline: (session: DuoRunSession) => void;
}

export const IncomingDuoInviteModal: React.FC<IncomingDuoInviteModalProps> = ({
  session,
  onAccept,
  onDecline,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  if (!session) return null;

  const hostInitial = (session.hostName?.trim().charAt(0) || 'R').toUpperCase();

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
            <Ionicons name="flash" size={32} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            INCOMING DUO RUN INVITE
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
                Ready to sync and run together live!
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Accept to connect your GPS tracking and see each other's live location and pace in real-time.
          </Text>

          {/* Actions */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.declineBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => onDecline(session)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
              <Text style={[styles.declineBtnText, { color: colors.textSecondary }]}>
                DECLINE
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptBtn,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={() => onAccept(session)}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={18} color="#000000" />
              <Text style={styles.acceptBtnText}>ACCEPT & RUN</Text>
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
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  hostSubtext: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  acceptBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmergencyContact, SOSLocationPayload, SOSSettings } from '../../types/sos';
import { sosService } from '../../services/sosService';
import { EmergencyContactsModal } from './EmergencyContactsModal';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocation?: { latitude: number; longitude: number; altitude?: number | null; accuracy?: number | null } | null;
  runnerName?: string;
  sessionId?: string;
  runMode?: string;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  visible,
  onClose,
  currentLocation,
  runnerName = 'Jogpal Runner',
  sessionId,
  runMode,
}) => {
  const [countdown, setCountdown] = useState<number>(3);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [primaryContact, setPrimaryContact] = useState<EmergencyContact | null>(null);
  const [isStrobeActive, setIsStrobeActive] = useState<boolean>(false);
  const [showContactsManager, setShowContactsManager] = useState<boolean>(false);
  const [settings, setSettings] = useState<SOSSettings | null>(null);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const strobeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [strobeColor, setStrobeColor] = useState<string>('#DC2626');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      loadInitialData();
      startCountdown();
      startPulseAnimation();
    } else {
      cleanupTimers();
      sosService.stopDistressVibration();
      setIsStrobeActive(false);
      setIsArmed(false);
    }
    return () => {
      cleanupTimers();
      sosService.stopDistressVibration();
    };
  }, [visible]);

  const loadInitialData = async () => {
    const loadedSettings = await sosService.getSettings();
    setSettings(loadedSettings);
    const loadedContacts = await sosService.getEmergencyContacts();
    setContacts(loadedContacts);
    const primary = loadedContacts.find((c) => c.isPrimary) || loadedContacts[0] || null;
    setPrimaryContact(primary);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startCountdown = () => {
    setCountdown(3);
    setIsArmed(false);

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          handleArmSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cleanupTimers = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (strobeIntervalRef.current) {
      clearInterval(strobeIntervalRef.current);
      strobeIntervalRef.current = null;
    }
  };

  const handleArmSOS = () => {
    setIsArmed(true);
    // Start Morse code vibration
    sosService.startDistressVibration();

    // Broadcast to companion run session if active
    if (sessionId && runMode) {
      const locPayload: SOSLocationPayload = {
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0,
        altitude: currentLocation?.altitude || null,
        accuracy: currentLocation?.accuracy || null,
        timestamp: Date.now(),
      };
      sosService.broadcastSessionAlert(sessionId, runMode, {
        id: `sos_${Date.now()}`,
        runnerName,
        location: locPayload,
        mapsUrl: sosService.formatGoogleMapsUrl(locPayload.latitude, locPayload.longitude),
        triggeredAt: new Date().toISOString(),
        sessionId,
        runMode,
      });
    }
  };

  const handleCancelCountdown = () => {
    cleanupTimers();
    sosService.stopDistressVibration();
    setIsStrobeActive(false);
    onClose();
  };

  const toggleStrobeBeacon = () => {
    if (isStrobeActive) {
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
      sosService.stopDistressVibration();
      setIsStrobeActive(false);
      setStrobeColor('#DC2626');
    } else {
      setIsStrobeActive(true);
      sosService.startDistressVibration();
      strobeIntervalRef.current = setInterval(() => {
        setStrobeColor((prev) => (prev === '#DC2626' ? '#FFFFFF' : '#DC2626'));
      }, 250);
    }
  };

  const getLocationPayload = (): SOSLocationPayload | null => {
    if (!currentLocation || !Number.isFinite(currentLocation.latitude)) return null;
    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      altitude: currentLocation.altitude || null,
      accuracy: currentLocation.accuracy || null,
      timestamp: Date.now(),
    };
  };

  const handleCallContact = async (contact: EmergencyContact) => {
    try {
      await sosService.callPhone(contact.phoneNumber);
    } catch (e: any) {
      Alert.alert('Calling Failed', e.message || 'Could not place phone call.');
    }
  };

  const handleSendLocationSMS = async (contact: EmergencyContact) => {
    const loc = getLocationPayload();
    const message = sosService.buildEmergencyMessage(runnerName, loc);
    const success = await sosService.sendEmergencySMS(contact.phoneNumber, message);
    if (!success) {
      Alert.alert('Dispatch Error', 'Could not dispatch SMS. Please try sharing directly.');
    }
  };

  const handleCallEmergencyServices = async () => {
    const number = settings?.nationalEmergencyNumber || '112';
    try {
      await sosService.callPhone(number);
    } catch (e: any) {
      Alert.alert('Dialing Failed', `Could not dial emergency services (${number}).`);
    }
  };

  const handleContactsUpdated = (updated: EmergencyContact[]) => {
    setContacts(updated);
    const primary = updated.find((c) => c.isPrimary) || updated[0] || null;
    setPrimaryContact(primary);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancelCountdown}>
      <View style={[styles.container, isStrobeActive && { backgroundColor: strobeColor }]}>
        <View style={styles.contentCard}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.emergencyBadge}>
              <Ionicons name="warning" size={16} color="#FFFFFF" />
              <Text style={styles.emergencyBadgeText}>EMERGENCY SOS</Text>
            </View>
            <TouchableOpacity style={styles.closeHeaderBtn} onPress={handleCancelCountdown}>
              <Ionicons name="close" size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          {/* Countdown Guard or Active Alert View */}
          {!isArmed && countdown > 0 ? (
            <View style={styles.countdownContainer}>
              <Animated.View style={[styles.countdownCircle, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.countdownNumber}>{countdown}</Text>
              </Animated.View>
              <Text style={styles.countdownTitle}>ARMING EMERGENCY DISPATCH</Text>
              <Text style={styles.countdownSubtitle}>
                Release or tap CANCEL below if this was pressed by mistake.
              </Text>
              <View style={styles.countdownActions}>
                <TouchableOpacity
                  style={styles.cancelCountdownBtn}
                  onPress={handleCancelCountdown}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelCountdownText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dispatchNowBtn}
                  onPress={handleArmSOS}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dispatchNowText}>DISPATCH NOW</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* Active Alarm Notice */}
              <View style={styles.armedBanner}>
                <Ionicons name="shield-outline" size={20} color="#EF4444" />
                <View style={styles.armedBannerTextCol}>
                  <Text style={styles.armedBannerTitle}>EMERGENCY MODE ARMED</Text>
                  <Text style={styles.armedBannerSub}>Distress signal active with GPS coordinates</Text>
                </View>
              </View>

              {/* Live Location Box */}
              <View style={styles.locationCard}>
                <View style={styles.locationHeaderRow}>
                  <Ionicons name="navigate-circle-outline" size={18} color="#CCFF00" />
                  <Text style={styles.locationHeaderTitle}>LIVE GPS COORDINATES</Text>
                </View>
                {currentLocation && Number.isFinite(currentLocation.latitude) ? (
                  <View style={styles.coordsGrid}>
                    <View style={styles.coordCol}>
                      <Text style={styles.coordLabel}>LATITUDE</Text>
                      <Text style={styles.coordValue}>{currentLocation.latitude.toFixed(6)}°</Text>
                    </View>
                    <View style={styles.coordDivider} />
                    <View style={styles.coordCol}>
                      <Text style={styles.coordLabel}>LONGITUDE</Text>
                      <Text style={styles.coordValue}>{currentLocation.longitude.toFixed(6)}°</Text>
                    </View>
                    <View style={styles.coordDivider} />
                    <View style={styles.coordCol}>
                      <Text style={styles.coordLabel}>ACCURACY</Text>
                      <Text style={styles.coordValue}>
                        {currentLocation.accuracy ? `±${Math.round(currentLocation.accuracy)}m` : 'HIGH'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.locationSearchingText}>Acquiring precise satellite fix...</Text>
                )}
              </View>

              {/* Primary Contact Section */}
              {primaryContact ? (
                <View style={styles.actionCard}>
                  <View style={styles.contactRow}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {primaryContact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{primaryContact.name}</Text>
                      <Text style={styles.contactRole}>
                        Primary Contact • {primaryContact.relationship}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowContactsManager(true)}
                      style={styles.switchContactBtn}
                    >
                      <Text style={styles.switchContactText}>CHANGE</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.contactActionButtons}>
                    <TouchableOpacity
                      style={styles.callContactBtn}
                      onPress={() => handleCallContact(primaryContact)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                      <Text style={styles.callContactText}>CALL NOW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.smsContactBtn}
                      onPress={() => handleSendLocationSMS(primaryContact)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                      <Text style={styles.smsContactText}>SEND GPS SMS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.noContactCard}>
                  <Ionicons name="person-add-outline" size={24} color="#EF4444" />
                  <Text style={styles.noContactTitle}>No Emergency Contact Set</Text>
                  <Text style={styles.noContactSub}>
                    Configure a trusted family member or friend to receive instant GPS SMS alerts.
                  </Text>
                  <TouchableOpacity
                    style={styles.setupContactsBtn}
                    onPress={() => setShowContactsManager(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.setupContactsBtnText}>SET UP EMERGENCY CONTACTS</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* National Emergency Services (112 / 911) */}
              <TouchableOpacity
                style={styles.nationalEmergencyBtn}
                onPress={handleCallEmergencyServices}
                activeOpacity={0.8}
              >
                <View style={styles.nationalEmergencyLeft}>
                  <View style={styles.policeIconBg}>
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.nationalEmergencyTitle}>
                      DIAL EMERGENCY ({settings?.nationalEmergencyNumber || '112'})
                    </Text>
                    <Text style={styles.nationalEmergencySub}>Direct connection to dispatchers</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Siren & Strobe Beacon */}
              <TouchableOpacity
                style={[
                  styles.strobeBtn,
                  isStrobeActive && styles.strobeBtnActive,
                ]}
                onPress={toggleStrobeBeacon}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isStrobeActive ? 'flash' : 'flash-outline'}
                  size={20}
                  color={isStrobeActive ? '#000000' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.strobeBtnText,
                    isStrobeActive && styles.strobeBtnTextActive,
                  ]}
                >
                  {isStrobeActive ? 'STOP STROBE & SIREN' : 'START STROBE BEACON & MORSE SOS'}
                </Text>
              </TouchableOpacity>

              {/* Cancel / De-escalate */}
              <TouchableOpacity
                style={styles.safeExitBtn}
                onPress={handleCancelCountdown}
                activeOpacity={0.7}
              >
                <Text style={styles.safeExitText}>I AM SAFE (DISMISS SOS)</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Emergency Contacts Manager Modal */}
        <EmergencyContactsModal
          visible={showContactsManager}
          onClose={() => setShowContactsManager(false)}
          onContactsUpdated={handleContactsUpdated}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  contentCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#121212',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  closeHeaderBtn: {
    padding: 4,
  },
  countdownContainer: {
    alignItems: 'center',
    padding: 28,
  },
  countdownCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#EF4444',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 10,
  },
  countdownNumber: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
  },
  countdownTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  countdownSubtitle: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  countdownActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelCountdownBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCountdownText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  dispatchNowBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchNowText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  scrollBody: {
    padding: 18,
  },
  armedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 14,
  },
  armedBannerTextCol: {
    flex: 1,
  },
  armedBannerTitle: {
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  armedBannerSub: {
    color: '#AAAAAA',
    fontSize: 11,
    marginTop: 2,
  },
  locationCard: {
    backgroundColor: '#181818',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 14,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationHeaderTitle: {
    color: '#CCFF00',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  coordsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coordCol: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  coordValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  coordDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
  },
  locationSearchingText: {
    color: '#888888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: '#181818',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    marginBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  contactRole: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
  },
  switchContactBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#262626',
  },
  switchContactText: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: '700',
  },
  contactActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  callContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  callContactText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  smsContactBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  smsContactText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  noContactCard: {
    backgroundColor: '#181818',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 14,
  },
  noContactTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  noContactSub: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  setupContactsBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  setupContactsBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  nationalEmergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B91C1C',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  nationalEmergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  policeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nationalEmergencyTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  nationalEmergencySub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  strobeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    marginBottom: 14,
  },
  strobeBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  strobeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  strobeBtnTextActive: {
    color: '#000000',
  },
  safeExitBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  safeExitText: {
    color: '#888888',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

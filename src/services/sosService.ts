import { Linking, Platform, Share, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from '@firebase/firestore';
import { db } from '../config/firebase';
import {
  EmergencyContact,
  SOSAlertEvent,
  SOSLocationPayload,
  SOSSettings,
} from '../types/sos';

const CONTACTS_STORAGE_KEY = '@jogpal_emergency_contacts_v1';
const SETTINGS_STORAGE_KEY = '@jogpal_sos_settings_v1';

// SOS Morse code pattern: ... --- ... (short, short, short, long, long, long, short, short, short)
// Wait 0ms, on 150, off 150, on 150, off 150, on 150, off 300, on 400, off 150, on 400, off 150, on 400, off 300, on 150, off 150, on 150, off 150, on 150, off 800
export const SOS_MORSE_VIBRATION_PATTERN = [
  0, 150, 150, 150, 150, 150, 300, 400, 150, 400, 150, 400, 300, 150, 150, 150, 150, 150, 800,
];

const DEFAULT_SETTINGS: SOSSettings = {
  contacts: [],
  nationalEmergencyNumber: '112',
  enableStrobeBeacon: true,
  enableVibrationPattern: true,
  countdownSeconds: 3,
};

export const sosService = {
  /**
   * Load stored emergency contacts
   */
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const raw = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[sosService] Error loading emergency contacts:', e);
      return [];
    }
  },

  /**
   * Save full emergency contacts list
   */
  async saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.warn('[sosService] Error saving emergency contacts:', e);
    }
  },

  /**
   * Add or update an emergency contact
   */
  async upsertEmergencyContact(
    contactData: Omit<EmergencyContact, 'id' | 'createdAt'> & { id?: string }
  ): Promise<EmergencyContact> {
    const existing = await this.getEmergencyContacts();
    const id = contactData.id || `contact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const isFirstContact = existing.length === 0;

    const updatedContact: EmergencyContact = {
      id,
      name: contactData.name.trim(),
      phoneNumber: contactData.phoneNumber.trim(),
      relationship: contactData.relationship.trim() || 'Emergency Contact',
      isPrimary: contactData.isPrimary ?? isFirstContact,
      createdAt: new Date().toISOString(),
    };

    let updatedList: EmergencyContact[];
    const index = existing.findIndex((c) => c.id === id);

    if (index >= 0) {
      updatedList = [...existing];
      updatedList[index] = updatedContact;
    } else {
      updatedList = [...existing, updatedContact];
    }

    // If marked as primary, ensure other contacts are not primary
    if (updatedContact.isPrimary) {
      updatedList = updatedList.map((c) =>
        c.id === id ? c : { ...c, isPrimary: false }
      );
    } else if (!updatedList.some((c) => c.isPrimary) && updatedList.length > 0) {
      // Ensure at least one contact is marked primary
      updatedList[0].isPrimary = true;
    }

    await this.saveEmergencyContacts(updatedList);
    return updatedContact;
  },

  /**
   * Delete an emergency contact
   */
  async deleteEmergencyContact(id: string): Promise<EmergencyContact[]> {
    const existing = await this.getEmergencyContacts();
    let remaining = existing.filter((c) => c.id !== id);

    // If deleted contact was primary, designate the first remaining as primary
    if (existing.find((c) => c.id === id)?.isPrimary && remaining.length > 0) {
      remaining = remaining.map((c, idx) => (idx === 0 ? { ...c, isPrimary: true } : c));
    }

    await this.saveEmergencyContacts(remaining);
    return remaining;
  },

  /**
   * Get primary emergency contact
   */
  async getPrimaryContact(): Promise<EmergencyContact | null> {
    const contacts = await this.getEmergencyContacts();
    return contacts.find((c) => c.isPrimary) || contacts[0] || null;
  },

  /**
   * Get SOS settings
   */
  async getSettings(): Promise<SOSSettings> {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const contacts = await this.getEmergencyContacts();
      if (!raw) {
        return { ...DEFAULT_SETTINGS, contacts };
      }
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        contacts,
      };
    } catch (e) {
      console.warn('[sosService] Error loading SOS settings:', e);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Update SOS settings
   */
  async updateSettings(settings: Partial<SOSSettings>): Promise<SOSSettings> {
    try {
      const current = await this.getSettings();
      const merged = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.warn('[sosService] Error updating SOS settings:', e);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Formats Google Maps URL from latitude & longitude
   */
  formatGoogleMapsUrl(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  },

  /**
   * Builds the formatted urgent emergency SMS message
   */
  buildEmergencyMessage(
    runnerName: string,
    location: SOSLocationPayload | null
  ): string {
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      const mapsUrl = this.formatGoogleMapsUrl(location.latitude, location.longitude);
      const accuracyStr = location.accuracy ? ` (Accuracy: ~${Math.round(location.accuracy)}m)` : '';
      return `EMERGENCY SOS: ${runnerName || 'A Jogpal runner'} triggered an SOS at ${timeStr} and needs urgent help! Location: ${mapsUrl}${accuracyStr}. Sent via Jogpal Runner Safety.`;
    }

    return `EMERGENCY SOS: ${runnerName || 'A Jogpal runner'} triggered an SOS at ${timeStr} and needs urgent help! Please contact immediately. Sent via Jogpal Runner Safety.`;
  },

  /**
   * Initiates a direct phone call via native dialer (tel:)
   */
  async callPhone(phoneNumber: string): Promise<boolean> {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    if (!cleaned) {
      throw new Error('Invalid phone number provided for emergency call.');
    }
    const url = `tel:${cleaned}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.open(url, '_self');
        return true;
      } catch (e) {
        window.location.href = url;
        return true;
      }
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        await Linking.openURL(url);
        return true;
      }
    } catch (err) {
      console.warn('[sosService] Cannot open dialer URL:', url, err);
      return false;
    }
  },

  /**
   * Dispatches Emergency SOS via WhatsApp (works on both Web & Mobile)
   */
  async sendWhatsAppSOS(phoneNumber: string, message: string): Promise<boolean> {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    const encodedBody = encodeURIComponent(message);
    const waUrl = cleaned
      ? `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodedBody}`
      : `https://api.whatsapp.com/send?text=${encodedBody}`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
      return true;
    }

    try {
      await Linking.openURL(waUrl);
      return true;
    } catch (e) {
      try {
        await Linking.openURL(`whatsapp://send?phone=${cleaned}&text=${encodedBody}`);
        return true;
      } catch (appErr) {
        console.warn('[sosService] WhatsApp launch failed:', appErr);
        return false;
      }
    }
  },

  /**
   * Copies distress message and GPS link to clipboard
   */
  async copyDistressMessage(message: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(message);
        return true;
      } catch (e) {
        console.warn('[sosService] Clipboard copy failed:', e);
      }
    }
    return false;
  },

  /**
   * Initiates direct emergency SMS dispatch with pre-filled message and location link
   */
  async sendEmergencySMS(
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(message);
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = cleaned ? `sms:${cleaned}${separator}body=${encodedBody}` : `sms:${separator}body=${encodedBody}`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        try {
          window.open(smsUrl, '_self');
        } catch (e) {}
      }
      // On web, always copy to clipboard so runner has instant access
      await this.copyDistressMessage(message);
      return true;
    }

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        return true;
      }
    } catch (e) {
      console.warn('[sosService] SMS url open failed, trying Share fallback:', e);
    }

    // Universal fallback: Native Share sheet
    try {
      await Share.share({
        title: 'EMERGENCY SOS - Jogpal Runner Needs Help',
        message,
      });
      return true;
    } catch (shareErr) {
      console.warn('[sosService] Share fallback failed:', shareErr);
      return false;
    }
  },

  /**
   * Starts distress beacon vibration (Morse code SOS)
   */
  startDistressVibration(): void {
    try {
      Vibration.vibrate(SOS_MORSE_VIBRATION_PATTERN, true);
    } catch (e) {
      console.warn('[sosService] Error triggering SOS vibration:', e);
    }
  },

  /**
   * Stops distress beacon vibration
   */
  stopDistressVibration(): void {
    try {
      Vibration.cancel();
    } catch (e) {
      console.warn('[sosService] Error cancelling vibration:', e);
    }
  },

  /**
   * Broadcasts SOS Alert to companion runners in active Duo or Group sessions via Firestore
   */
  async broadcastSessionAlert(
    sessionId: string,
    mode: 'DUO' | 'GROUP' | string,
    alertEvent: SOSAlertEvent
  ): Promise<void> {
    if (!sessionId) return;
    try {
      const collectionName = mode === 'GROUP' ? 'group_runs' : 'duo_sessions';
      const sessionRef = doc(db, collectionName, sessionId);
      await updateDoc(sessionRef, {
        emergencyAlert: {
          ...alertEvent,
          timestamp: Date.now(),
        },
      });
    } catch (e) {
      console.warn('[sosService] Could not broadcast SOS to session:', e);
    }
  },
};

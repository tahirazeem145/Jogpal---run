import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { EmergencyContact } from '../../types/sos';
import { sosService } from '../../services/sosService';
import { useTheme } from '../../context/ThemeContext';

interface EmergencyContactsModalProps {
  visible: boolean;
  onClose: () => void;
  onContactsUpdated?: (contacts: EmergencyContact[]) => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  visible,
  onClose,
  onContactsUpdated,
}) => {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');

  const RELATIONSHIPS = ['Family', 'Partner', 'Friend', 'Coach', 'Colleague', 'Other'];

  useEffect(() => {
    if (visible) {
      loadContacts();
      resetForm();
    }
  }, [visible]);

  const loadContacts = async () => {
    const list = await sosService.getEmergencyContacts();
    setContacts(list);
    if (onContactsUpdated) {
      onContactsUpdated(list);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setRelationship('Family');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phoneNumber);
    setRelationship(contact.relationship || 'Family');
    setIsAdding(true);
  };

  const handleSaveContact = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please provide a name for the emergency contact.');
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 5) {
      Alert.alert('Invalid Phone Number', 'Please provide a valid phone number.');
      return;
    }

    await sosService.upsertEmergencyContact({
      id: editingId || undefined,
      name: trimmedName,
      phoneNumber: trimmedPhone,
      relationship,
      isPrimary: contacts.length === 0,
    });

    await loadContacts();
    resetForm();
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.name} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await sosService.deleteEmergencyContact(contact.id);
            setContacts(updated);
            if (onContactsUpdated) {
              onContactsUpdated(updated);
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (contact: EmergencyContact) => {
    await sosService.upsertEmergencyContact({
      ...contact,
      isPrimary: true,
    });
    await loadContacts();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalCard, { backgroundColor: '#121212', borderColor: '#2A2A2A' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerShield}>
                <Ionicons name="shield-checkmark" size={18} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.modalTitle}>EMERGENCY CONTACTS</Text>
                <Text style={styles.modalSubtitle}>Notified during SOS triggers</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#888888" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Contacts List */}
            {contacts.length === 0 && !isAdding ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <Ionicons name="people-outline" size={32} color="#666666" />
                </View>
                <Text style={styles.emptyTitle}>No Emergency Contacts Added</Text>
                <Text style={styles.emptyText}>
                  Add at least one trusted contact who will receive your live GPS location during an emergency.
                </Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsAdding(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#000000" />
                  <Text style={styles.addBtnText}>ADD FIRST CONTACT</Text>
                </TouchableOpacity>
              </View>
            ) : (
              contacts.map((contact) => (
                <View
                  key={contact.id}
                  style={[
                    styles.contactCard,
                    contact.isPrimary && styles.primaryContactCard,
                  ]}
                >
                  <View style={styles.contactLeft}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: contact.isPrimary ? '#EF4444' : '#262626' },
                      ]}
                    >
                      <Text style={styles.avatarLetter}>
                        {contact.name.charAt(0).toUpperCase() || 'C'}
                      </Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <View style={styles.nameRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.isPrimary ? (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                      <Text style={styles.contactRelation}>{contact.relationship}</Text>
                    </View>
                  </View>

                  <View style={styles.contactActions}>
                    {!contact.isPrimary ? (
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleSetPrimary(contact)}
                        accessibilityLabel="Set as Primary"
                      >
                        <Ionicons name="star-outline" size={18} color="#EAB308" />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleStartEdit(contact)}
                      accessibilityLabel="Edit Contact"
                    >
                      <Feather name="edit-2" size={16} color="#AAAAAA" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDeleteContact(contact)}
                      accessibilityLabel="Delete Contact"
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Add / Edit Form */}
            {isAdding ? (
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>
                  {editingId ? 'EDIT CONTACT' : 'ADD EMERGENCY CONTACT'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Sarah Connor"
                    placeholderTextColor="#555555"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PHONE NUMBER (WITH COUNTRY CODE)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. +1 555 123 4567"
                    placeholderTextColor="#555555"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>RELATIONSHIP</Text>
                  <View style={styles.chipsRow}>
                    {RELATIONSHIPS.map((rel) => {
                      const isSelected = relationship === rel;
                      return (
                        <TouchableOpacity
                          key={rel}
                          style={[
                            styles.chip,
                            isSelected && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                          ]}
                          onPress={() => setRelationship(rel)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: '#FFFFFF', fontWeight: 'bold' },
                            ]}
                          >
                            {rel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formActionsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={resetForm}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#EF4444' }]}
                    onPress={handleSaveContact}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>SAVE CONTACT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : contacts.length > 0 ? (
              <TouchableOpacity
                style={styles.addNewRowBtn}
                onPress={() => setIsAdding(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.addNewRowText}>ADD ANOTHER CONTACT</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerShield: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSubtitle: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181818',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  primaryContactCard: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  primaryBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  contactPhone: {
    color: '#CCCCCC',
    fontSize: 13,
    marginTop: 2,
  },
  contactRelation: {
    color: '#777777',
    fontSize: 11,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#222222',
  },
  addNewRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#EF4444',
    gap: 8,
    marginTop: 10,
  },
  addNewRowText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  formContainer: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 10,
  },
  formTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#333333',
  },
  chipText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#AAAAAA',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

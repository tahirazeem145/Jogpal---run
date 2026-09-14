import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { CommunityEvent, WeatherData } from '../../types/community';
import { communityService } from '../../services/communityService';
import { useTheme } from '../../context/ThemeContext';

interface HostEventModalProps {
  visible: boolean;
  onClose: () => void;
  communityId: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  onEventCreated?: (event: CommunityEvent) => void;
}

export const HostEventModal: React.FC<HostEventModalProps> = ({
  visible,
  onClose,
  communityId,
  hostId,
  hostName,
  hostAvatar,
  onEventCreated,
}) => {
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('Tomorrow @ 07:00');
  const [location, setLocation] = useState('');
  const [distanceKm, setDistanceKm] = useState('5.00 KM');
  const [targetPace, setTargetPace] = useState('5:30 /km');
  const [description, setDescription] = useState('');

  // Weather Condition Parameters
  const [temp, setTemp] = useState('22°C');
  const [condition, setCondition] = useState('Clear & Cool');
  const [humidity, setHumidity] = useState('50%');
  const [windSpeed, setWindSpeed] = useState('10 km/h');
  const [advice, setAdvice] = useState('Optimal running conditions! Hydrate & enjoy.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weatherPresets: WeatherData[] = [
    {
      temp: '22°C',
      condition: 'Clear & Mild Sunset',
      icon: 'sun',
      humidity: '52%',
      windSpeed: '9 km/h',
      advice: 'Perfect running weather! Lightweight gear recommended.',
    },
    {
      temp: '18°C',
      condition: 'Crisp & Cool Morning',
      icon: 'cloud-sun',
      humidity: '60%',
      windSpeed: '7 km/h',
      advice: 'Ideal morning temps for high-intensity intervals!',
    },
    {
      temp: '16°C',
      condition: 'Light Breezy Trail',
      icon: 'thermometer',
      humidity: '65%',
      windSpeed: '14 km/h',
      advice: 'Breezy conditions. Bring a light windbreaker jacket.',
    },
    {
      temp: '25°C',
      condition: 'Warm & Sunny Sprints',
      icon: 'sun',
      humidity: '45%',
      windSpeed: '5 km/h',
      advice: 'Sunny and warm. Bring hydration & sunscreen.',
    },
  ];

  const applyPreset = (w: WeatherData) => {
    setTemp(w.temp);
    setCondition(w.condition);
    setHumidity(w.humidity);
    setWindSpeed(w.windSpeed);
    setAdvice(w.advice);
  };

  const handleHostEvent = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert('Missing Fields', 'Please enter Event Title and Meeting Location.');
      return;
    }

    setIsSubmitting(true);

    const weatherData: WeatherData = {
      temp: temp.trim() || '20°C',
      condition: condition.trim() || 'Clear',
      icon: condition.toLowerCase().includes('rain')
        ? 'cloud-rain'
        : condition.toLowerCase().includes('cloud')
        ? 'cloud-sun'
        : 'sun',
      humidity: humidity.trim() || '50%',
      windSpeed: windSpeed.trim() || '10 km/h',
      advice: advice.trim() || 'Optimal running weather!',
    };

    const newEvt = await communityService.hostCommunityEvent(communityId, {
      title: title.trim(),
      hostId,
      hostName,
      hostAvatar,
      date: date.trim() || 'Today @ 18:00',
      location: location.trim(),
      distanceKm: distanceKm.trim() || '5.00 KM',
      targetPace: targetPace.trim() || '5:30 /km',
      description: description.trim() || 'Community group run session.',
      weather: weatherData,
    });

    setIsSubmitting(false);
    Alert.alert('Event Hosted! 🏃‍♂️⚡', `Event "${newEvt.title}" is now active in your community!`);
    if (onEventCreated) onEventCreated(newEvt);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>HOST COMMUNITY EVENT</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Schedule a run with weather condition checks
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.cardSubtle }]} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>EVENT TITLE *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="e.g. Sunset 5K Cyber Sprint & Social"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>DATE & TIME *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="Today @ 18:30"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={setDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>DISTANCE *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="5.00 KM"
                  placeholderTextColor={colors.textMuted}
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>MEETING LOCATION *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="e.g. Riverfront Promenade Arch"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />

            <Text style={[styles.label, { color: colors.textPrimary }]}>TARGET PACE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="e.g. 5:15 /km"
              placeholderTextColor={colors.textMuted}
              value={targetPace}
              onChangeText={setTargetPace}
            />

            {/* Weather Condition Section */}
            <View style={[styles.weatherBox, { backgroundColor: colors.surface, borderColor: colors.primaryMuted }]}>
              <View style={styles.weatherHeader}>
                <Ionicons name="cloudy-night-outline" size={20} color={colors.primary} />
                <Text style={[styles.weatherTitle, { color: colors.primary }]}>
                  WEATHER FORECAST & RUNNER ADVISORY
                </Text>
              </View>

              <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>QUICK PRESETS:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {weatherPresets.map((wp, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => applyPreset(wp)}
                  >
                    <Ionicons name="sunny-outline" size={14} color={colors.primary} />
                    <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                      {wp.temp} • {wp.condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>TEMP (°C)</Text>
                  <TextInput
                    style={[styles.inputSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    value={temp}
                    onChangeText={setTemp}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>CONDITION</Text>
                  <TextInput
                    style={[styles.inputSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    value={condition}
                    onChangeText={setCondition}
                  />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>HUMIDITY</Text>
                  <TextInput
                    style={[styles.inputSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    value={humidity}
                    onChangeText={setHumidity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>WIND SPEED</Text>
                  <TextInput
                    style={[styles.inputSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                    value={windSpeed}
                    onChangeText={setWindSpeed}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>RUNNER WEATHER ADVICE</Text>
              <TextInput
                style={[styles.inputSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                value={advice}
                onChangeText={setAdvice}
              />
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>EVENT DESCRIPTION</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
              placeholder="What runners should expect during this event..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={[styles.hostBtn, { backgroundColor: colors.primary }]}
              onPress={handleHostEvent}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.hostBtnText}>{isSubmitting ? 'HOSTING...' : 'PUBLISH EVENT'}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#000000" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    maxHeight: 480,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  inputSmall: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '600',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  weatherBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  weatherTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  presetLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
    gap: 4,
  },
  presetText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  hostBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
});

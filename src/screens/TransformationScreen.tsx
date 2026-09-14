import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { TransformationPhoto, TransformationMap } from '../types/transformation';
import { transformationService } from '../services/transformationService';
import { useTheme } from '../context/ThemeContext';

const SAMPLE_FITNESS_PHOTOS = [
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop',
];

export const TransformationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { userProfile, user } = useApp();
  const { colors } = useTheme();

  const userId = userProfile?.id || user?.uid || 'guest_runner';

  const [photosMap, setPhotosMap] = useState<TransformationMap>({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [uploadPickerDay, setUploadPickerDay] = useState<number | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [uploadingDay, setUploadingDay] = useState<number | null>(null);

  // Web Live Camera State
  const [webCameraDay, setWebCameraDay] = useState<number | null>(null);
  const [webStream, setWebStream] = useState<any>(null);
  const videoRef = React.useRef<any>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await transformationService.getPhotos(userId);
    setPhotosMap(data);
    setLoading(false);
  };

  const capturedCount = Object.keys(photosMap).length;
  const daysArray = Array.from({ length: 30 }, (_, i) => i + 1);

  const day1Photo = photosMap[1];
  const sortedDayNumbers = Object.keys(photosMap)
    .map(Number)
    .sort((a, b) => a - b);
  const latestDayNum = sortedDayNumbers.length > 0 ? sortedDayNumbers[sortedDayNumbers.length - 1] : null;
  const latestPhoto = latestDayNum ? photosMap[latestDayNum] : null;

  const handleSlotPress = (dayNum: number) => {
    if (photosMap[dayNum]) {
      openDayDetail(dayNum);
    } else {
      setUploadPickerDay(dayNum);
      setCustomUrlInput('');
    }
  };

  const handleCameraPress = (dayNum: number) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      startWebCamera(dayNum);
    } else {
      captureNativeCamera(dayNum);
    }
  };

  const startWebCamera = async (dayNum: number) => {
    setUploadPickerDay(null);
    setWebCameraDay(dayNum);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setWebStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 300);
    } catch (err) {
      setWebCameraDay(null);
      captureNativeCamera(dayNum);
    }
  };

  const stopWebCamera = () => {
    if (webStream) {
      try {
        webStream.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      setWebStream(null);
    }
    setWebCameraDay(null);
  };

  const snapWebPhoto = async () => {
    if (!webCameraDay) return;
    try {
      const video = videoRef.current;
      if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const day = webCameraDay;
          stopWebCamera();
          await saveNewPhoto(day, dataUrl);
          return;
        }
      }
    } catch (e) {}
    stopWebCamera();
  };

  const captureNativeCamera = async (dayNum: number) => {
    setUploadPickerDay(null);
    setUploadingDay(dayNum);

    try {
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Needed', 'Camera access is required.');
          setUploadingDay(null);
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await saveNewPhoto(dayNum, result.assets[0].uri);
      }
    } catch (e) {
    } finally {
      setUploadingDay(null);
    }
  };

  const pickImageFromLibrary = async (dayNum: number) => {
    setUploadPickerDay(null);
    setUploadingDay(dayNum);

    try {
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Needed', 'Photo gallery access is required.');
          setUploadingDay(null);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await saveNewPhoto(dayNum, result.assets[0].uri);
      }
    } catch (e) {
    } finally {
      setUploadingDay(null);
    }
  };

  const saveFromUrl = async (dayNum: number, url?: string) => {
    const targetUrl = url || customUrlInput.trim();
    if (!targetUrl) {
      Alert.alert('Missing URL', 'Please enter a valid image URL.');
      return;
    }
    setUploadPickerDay(null);
    await saveNewPhoto(dayNum, targetUrl);
  };

  const saveNewPhoto = async (dayNum: number, uri: string) => {
    const newPhoto: TransformationPhoto = {
      dayNumber: dayNum,
      imageUri: uri,
      dateUploaded: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };

    const updated = await transformationService.savePhoto(userId, newPhoto);
    setPhotosMap(updated);
  };

  const handleDeletePhoto = async (dayNum: number) => {
    const updated = await transformationService.deletePhoto(userId, dayNum);
    setPhotosMap(updated);
    setSelectedDay(null);
  };

  const handleSaveNotes = async (dayNum: number) => {
    if (!photosMap[dayNum]) return;
    const existing = photosMap[dayNum];
    const updatedPhoto: TransformationPhoto = {
      ...existing,
      notes: noteInput.trim(),
      weightKg: weightInput.trim(),
    };
    const updated = await transformationService.savePhoto(userId, updatedPhoto);
    setPhotosMap(updated);
    Alert.alert('Saved! ✅', `Day ${dayNum} metrics updated.`);
    setSelectedDay(null);
  };

  const openDayDetail = (dayNum: number) => {
    setSelectedDay(dayNum);
    if (photosMap[dayNum]) {
      setNoteInput(photosMap[dayNum].notes || '');
      setWeightInput(photosMap[dayNum].weightKg || '');
    }
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
          <Ionicons name="camera" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>30-DAY TRANSFORMATION</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Continuous body progress, photo calendar & streak
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Tracker Bar */}
        <View style={[styles.progressBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.primary }]}>30-DAY PROGRESS STREAK</Text>
            <Text style={[styles.progressCount, { color: colors.textPrimary }]}>
              {capturedCount} / 30 Days Captured
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.cardSubtle }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.max((capturedCount / 30) * 100, 3)}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* 30-DAY CALENDAR GRID SPACE */}
        <Text style={[styles.gridTitle, { color: colors.textPrimary }]}>30-DAY PHOTO CALENDAR GRID</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.gridContainer}>
            {daysArray.map((dayNum) => {
              const photoObj = photosMap[dayNum];
              const isUploadingThis = uploadingDay === dayNum;

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.gridSlot,
                    {
                      backgroundColor: photoObj ? colors.card : colors.surface,
                      borderColor: photoObj ? colors.primary : colors.cardBorder,
                    },
                  ]}
                  onPress={() => handleSlotPress(dayNum)}
                  activeOpacity={0.8}
                >
                  {/* Day Header Badge */}
                  <View style={[styles.dayHeaderBadge, { backgroundColor: photoObj ? colors.primary : colors.cardSubtle }]}>
                    <Text
                      style={[
                        styles.dayHeaderNumber,
                        { color: photoObj ? '#000000' : colors.textSecondary },
                      ]}
                    >
                      DAY {dayNum}
                    </Text>
                  </View>

                  {/* Photo or Plus Icon */}
                  {isUploadingThis ? (
                    <View style={styles.slotCenter}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : photoObj ? (
                    <Image source={{ uri: photoObj.imageUri }} style={styles.slotImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.slotCenter}>
                      <View style={[styles.plusIconCircle, { backgroundColor: colors.accentSubtle, borderColor: colors.primary }]}>
                        <Feather name="plus" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.addPhotoText, { color: colors.textMuted }]}>ADD PHOTO</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* WEB LIVE CAMERA MODAL STREAM */}
      <Modal visible={webCameraDay !== null} transparent animationType="fade" onRequestClose={stopWebCamera}>
        <View style={styles.detailOverlay}>
          <View style={[styles.webCamCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                DAY {webCameraDay} LIVE CAMERA CAPTURE
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.cardSubtle }]}
                onPress={stopWebCamera}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.webCamVideoWrapper}>
              {Platform.OS === 'web' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: 260, borderRadius: 14, objectFit: 'cover' }}
                />
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.snapBtn, { backgroundColor: colors.primary }]}
              onPress={snapWebPhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={20} color="#000000" />
              <Text style={styles.snapBtnText}>SNAP PROGRESS PHOTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* INTERACTIVE UPLOAD / CAPTURE OPTIONS MODAL */}
      <Modal
        visible={uploadPickerDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadPickerDay(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={[styles.uploadCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                  DAY {uploadPickerDay} PROGRESS PHOTO
                </Text>
                <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                  Choose how you want to add your transformation picture
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.cardSubtle }]}
                onPress={() => setUploadPickerDay(null)}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {uploadPickerDay && (
              <View style={styles.optionsList}>
                {/* 1. CAMERA CAPTURE BUTTON */}
                <TouchableOpacity
                  style={[styles.optionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleCameraPress(uploadPickerDay)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={22} color="#000000" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionBtnTitle}>TAKE PHOTO WITH CAMERA</Text>
                    <Text style={styles.optionBtnSub}>Open live camera to capture a progress shot</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. GALLERY UPLOAD BUTTON */}
                <TouchableOpacity
                  style={[styles.optionBtnOutline, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                  onPress={() => pickImageFromLibrary(uploadPickerDay)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images-outline" size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionBtnTitleOutline, { color: colors.primary }]}>UPLOAD FROM GALLERY / FILES</Text>
                    <Text style={[styles.optionBtnSubOutline, { color: colors.textSecondary }]}>Select existing picture from your device</Text>
                  </View>
                </TouchableOpacity>

                {/* 3. PASTE IMAGE URL SECTION */}
                <View style={[styles.urlBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.urlLabel, { color: colors.textPrimary }]}>OR ENTER IMAGE URL</Text>
                  <View style={styles.urlInputRow}>
                    <TextInput
                      style={[styles.urlInput, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                      placeholder="https://..."
                      placeholderTextColor={colors.textMuted}
                      value={customUrlInput}
                      onChangeText={setCustomUrlInput}
                    />
                    <TouchableOpacity
                      style={[styles.urlAddBtn, { backgroundColor: colors.primary }]}
                      onPress={() => saveFromUrl(uploadPickerDay)}
                    >
                      <Text style={styles.urlAddBtnText}>ADD</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.presetLabel, { color: colors.textMuted }]}>QUICK SAMPLE FITNESS PHOTOS:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    {SAMPLE_FITNESS_PHOTOS.map((sampleUrl, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.sampleThumb, { borderColor: colors.primary }]}
                        onPress={() => saveFromUrl(uploadPickerDay, sampleUrl)}
                      >
                        <Image source={{ uri: sampleUrl }} style={styles.sampleImg} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* FULL DAY PHOTO & NOTES DETAIL MODAL */}
      <Modal visible={selectedDay !== null} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <View style={styles.detailOverlay}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                DAY {selectedDay} PROGRESS PHOTO
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.cardSubtle }]}
                onPress={() => setSelectedDay(null)}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedDay && photosMap[selectedDay] && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: photosMap[selectedDay].imageUri }}
                  style={styles.detailImage}
                  resizeMode="cover"
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>BODY WEIGHT / METRICS (OPTIONAL)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="e.g. 74.5 kg"
                  placeholderTextColor={colors.textMuted}
                  value={weightInput}
                  onChangeText={setWeightInput}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>PROGRESS NOTES / MOTIVATION</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.textPrimary }]}
                  placeholder="Notes on energy, body composition, workouts..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={noteInput}
                  onChangeText={setNoteInput}
                />

                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    style={[styles.replaceBtn, { borderColor: colors.primary }]}
                    onPress={() => {
                      const day = selectedDay;
                      setSelectedDay(null);
                      setUploadPickerDay(day);
                    }}
                  >
                    <Feather name="refresh-cw" size={14} color={colors.primary} />
                    <Text style={[styles.replaceBtnText, { color: colors.primary }]}>REPLACE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleSaveNotes(selectedDay)}
                  >
                    <Ionicons name="checkmark" size={16} color="#000000" />
                    <Text style={styles.saveBtnText}>SAVE NOTES</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteLink}
                  onPress={() => handleDeletePhoto(selectedDay)}
                >
                  <Feather name="trash-2" size={14} color="#FF4D4D" />
                  <Text style={styles.deleteLinkText}>Delete Photo for Day {selectedDay}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  progressBox: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  comparisonCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  compHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  compTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  compGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compCol: {
    flex: 1,
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  compTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    paddingVertical: 4,
  },
  compImg: {
    width: '100%',
    height: '100%',
  },
  compPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  compText: {
    fontSize: 10,
    fontWeight: '600',
  },
  versusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  versusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00FF88',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  gridSlot: {
    width: '31%',
    height: 125,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 2,
  },
  dayHeaderBadge: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  dayHeaderNumber: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  plusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webCamCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  webCamVideoWrapper: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  snapBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  uploadCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  detailCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  detailSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  optionsList: {
    gap: 12,
    marginTop: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  optionBtnTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  optionBtnSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    opacity: 0.8,
    marginTop: 1,
  },
  optionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  optionBtnTitleOutline: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  optionBtnSubOutline: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  urlBox: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  urlLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 12,
  },
  urlAddBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  urlAddBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  presetLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  sampleThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginRight: 8,
  },
  sampleImg: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '600',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  replaceBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  deleteLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF4D4D',
  },
});

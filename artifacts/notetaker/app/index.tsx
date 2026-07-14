import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/constants/colors";
import { API_BASE, useAuth } from "@/context/AuthContext";

interface ActiveCase {
  id: string;
  studentName: string;
  assessmentMeetingDate: string | null;
}

interface Recording {
  id: string;
  caseId: string;
  conversationType: string;
  transcript: string | null;
  structuredNotes: any;
  interviewDate: string | null;
  createdAt: string;
  studentName?: string;
}

type SessionType = "student_interview" | "classroom_observation";

const SESSION_TYPES: { value: SessionType; label: string; icon: string }[] = [
  { value: "student_interview", label: "Student Interview", icon: "person" },
  { value: "classroom_observation", label: "Classroom Obs.", icon: "eye" },
];

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user, logout, isLoading } = useAuth();

  const [cases, setCases] = useState<ActiveCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<ActiveCase | null>(null);
  const [casePickerOpen, setCasePickerOpen] = useState(false);

  const [sessionType, setSessionType] = useState<SessionType>("student_interview");

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const currentRecording = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 700 }),
          withTiming(1, { duration: 700 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const fetchCases = useCallback(async () => {
    if (!token) return;
    setCasesLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/invigilator/active-cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setCases(data);
        if (data.length > 0 && !selectedCase) setSelectedCase(data[0]);
      }
    } catch {}
    setCasesLoading(false);
  }, [token, selectedCase]);

  const fetchRecordings = useCallback(async () => {
    if (!token) return;
    setRecordingsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/invigilator/all-recordings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setRecordings(data);
      }
    } catch {}
    setRecordingsLoading(false);
  }, [token]);

  useEffect(() => {
    fetchCases();
    fetchRecordings();
  }, [token]);

  if (!isLoading && !token) return <Redirect href="/login" />;

  const startRecording = async () => {
    if (!selectedCase) {
      setStatusMsg("Select a case first");
      setStatusError(true);
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setStatusMsg("Microphone access is required");
        setStatusError(true);
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      currentRecording.current = recording;
      setIsRecording(true);
      setDuration(0);
      setLastTranscript(null);
      setStatusMsg(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (e: any) {
      setStatusMsg("Could not start recording");
      setStatusError(true);
    }
  };

  const stopRecording = async () => {
    if (!currentRecording.current) return;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const rec = currentRecording.current;
    currentRecording.current = null;
    const finalDuration = duration;

    try {
      await rec.stopAndUnloadAsync();
    } catch {}

    const uri = rec.getURI();
    if (!uri) {
      setStatusMsg("Recording failed — no file found");
      setStatusError(true);
      return;
    }

    setIsProcessing(true);
    setStatusMsg("Transcribing…");
    setStatusError(false);

    try {
      const uploadUrl =
        `${API_BASE}/api/cases/${selectedCase!.id}/interview-recordings` +
        `?type=${sessionType}&duration=${Math.round(finalDuration)}`;

      let responseBody: string | null = null;

      if (Platform.OS === "web") {
        const localResp = await fetch(uri);
        const blob = await localResp.blob();
        const apiResp = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": "audio/webm",
            Authorization: `Bearer ${token}`,
          },
          body: blob,
        });
        responseBody = await apiResp.text();
      } else {
        const result = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": "audio/m4a",
            Authorization: `Bearer ${token!}`,
          },
        });
        responseBody = result.body;
      }

      const data = JSON.parse(responseBody ?? "{}");
      if (data.transcript) setLastTranscript(data.transcript);
      setStatusMsg("Saved to case ✓");
      setStatusError(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchRecordings();
    } catch (e: any) {
      setStatusMsg("Upload failed — check connection");
      setStatusError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.sidebar, paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>ReMynd Notetaker</Text>
          {user && (
            <Text style={styles.headerSub}>{user.email}</Text>
          )}
        </View>
        <Pressable onPress={logout} hitSlop={8} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Case picker */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CASE</Text>
          {casesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : cases.length === 0 ? (
            <Text style={[styles.noCases, { color: colors.mutedForeground }]}>
              No active cases assigned
            </Text>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.casePicker, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setCasePickerOpen(true)}
            >
              <View style={styles.casePickerLeft}>
                <View style={[styles.caseAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.caseAvatarText}>
                    {selectedCase?.studentName?.charAt(0) ?? "?"}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.caseStudentName, { color: colors.foreground }]}>
                    {selectedCase?.studentName ?? "Select a case"}
                  </Text>
                  {selectedCase?.assessmentMeetingDate && (
                    <Text style={[styles.caseMeetingDate, { color: colors.mutedForeground }]}>
                      {formatDate(selectedCase.assessmentMeetingDate)}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Session type */}
        <View style={[styles.segmentedRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {SESSION_TYPES.map((s) => (
            <Pressable
              key={s.value}
              style={[
                styles.segmentBtn,
                sessionType === s.value && {
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 2,
                },
              ]}
              onPress={() => {
                setSessionType(s.value);
                Haptics.selectionAsync();
              }}
            >
              <Ionicons
                name={s.icon as any}
                size={14}
                color={sessionType === s.value ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color:
                      sessionType === s.value ? colors.foreground : colors.mutedForeground,
                    fontFamily:
                      sessionType === s.value ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Record area */}
        <View style={styles.recordArea}>
          {/* Outer ring when recording */}
          <Animated.View
            style={[
              styles.outerRing,
              pulseStyle,
              {
                borderColor: isRecording ? colors.recordingRing : "transparent",
                backgroundColor: isRecording ? colors.recordingBg : "transparent",
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.recordBtn,
                {
                  backgroundColor: isRecording ? colors.recording : colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || casesLoading}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={40}
                  color="#fff"
                />
              )}
            </Pressable>
          </Animated.View>

          {/* Timer */}
          <Text
            style={[
              styles.timerText,
              {
                color: isRecording ? colors.recording : colors.mutedForeground,
                fontFamily: isRecording ? "Inter_600SemiBold" : "Inter_400Regular",
              },
            ]}
          >
            {isRecording ? formatDuration(duration) : "Tap to record"}
          </Text>

          {/* Status message */}
          {statusMsg && (
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: statusError ? colors.recordingBg : colors.successBg,
                  borderColor: statusError ? "#fca5a5" : "#86efac",
                },
              ]}
            >
              <Ionicons
                name={statusError ? "alert-circle" : "checkmark-circle"}
                size={14}
                color={statusError ? colors.recording : colors.success}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusError ? colors.recording : colors.success },
                ]}
              >
                {statusMsg}
              </Text>
            </View>
          )}
        </View>

        {/* Transcript preview */}
        {lastTranscript && (
          <View style={[styles.transcriptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.transcriptLabel, { color: colors.mutedForeground }]}>
              TRANSCRIPT
            </Text>
            <Text style={[styles.transcriptText, { color: colors.foreground }]} numberOfLines={6}>
              {lastTranscript}
            </Text>
          </View>
        )}

        {/* Recent recordings */}
        {recordings.length > 0 && (
          <View>
            <Text style={[styles.historyHeader, { color: colors.mutedForeground }]}>
              RECENT RECORDINGS
            </Text>
            {recordings.slice(0, 10).map((r) => (
              <View
                key={r.id}
                style={[styles.recordingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View
                  style={[styles.recTypeIcon, { backgroundColor: colors.muted }]}
                >
                  <Ionicons
                    name={r.conversationType === "classroom_observation" ? "eye" : "person"}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.recInfo}>
                  <Text style={[styles.recStudent, { color: colors.foreground }]}>
                    {r.studentName ?? "Unknown"}
                  </Text>
                  <Text style={[styles.recMeta, { color: colors.mutedForeground }]}>
                    {r.conversationType === "classroom_observation"
                      ? "Classroom Obs."
                      : "Student Interview"}{" "}
                    · {formatDate(r.createdAt)} {formatTime(r.createdAt)}
                  </Text>
                  {r.transcript && (
                    <Text
                      style={[styles.recExcerpt, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {r.transcript}
                    </Text>
                  )}
                </View>
                {r.transcript && (
                  <Ionicons name="document-text-outline" size={16} color={colors.accent} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Case picker modal */}
      <Modal visible={casePickerOpen} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCasePickerOpen(false)}
        />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Select Case
          </Text>
          <FlatList
            data={cases}
            keyExtractor={(c) => c.id}
            scrollEnabled={!!cases.length}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.caseRow,
                  {
                    backgroundColor:
                      selectedCase?.id === item.id
                        ? colors.muted
                        : colors.card,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => {
                  setSelectedCase(item);
                  setCasePickerOpen(false);
                  Haptics.selectionAsync();
                }}
              >
                <View style={[styles.caseAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.caseAvatarText}>
                    {item.studentName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.caseStudentName, { color: colors.foreground }]}>
                    {item.studentName}
                  </Text>
                  {item.assessmentMeetingDate && (
                    <Text style={[styles.caseMeetingDate, { color: colors.mutedForeground }]}>
                      {formatDate(item.assessmentMeetingDate)}
                    </Text>
                  )}
                </View>
                {selectedCase?.id === item.id && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  logoutBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  section: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  noCases: { fontSize: 14, fontFamily: "Inter_400Regular" },

  casePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  casePickerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  caseAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  caseAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  caseStudentName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  caseMeetingDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },

  segmentedRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentLabel: {
    fontSize: 13,
  },

  recordArea: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 20,
  },
  outerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  timerText: {
    fontSize: 22,
    letterSpacing: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  transcriptCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  transcriptLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  historyHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  recTypeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  recInfo: { flex: 1, gap: 2 },
  recStudent: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  recMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recExcerpt: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  caseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
});

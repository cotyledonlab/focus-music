import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlayButton } from "../src/components/PlayButton";
import { TimerPills } from "../src/components/TimerPills";
import { VolumeControl } from "../src/components/VolumeControl";
import { type FocusMode } from "../src/constants/modes";
import { theme } from "../src/constants/theme";
import { usePlayer } from "../src/hooks/usePlayer";

const isFocusMode = (value: unknown): value is FocusMode =>
  value === "focus" || value === "relax" || value === "sleep";

const formatCountdown = (seconds: number | null) => {
  if (seconds == null) {
    return "No timer";
  }

  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { mode, modeConfig, isPlaying, isBusy, volume, timerSeconds, remainingSeconds, error, selectMode, setVolume, setTimerMinutes, togglePlayback } =
    usePlayer();

  useEffect(() => {
    const incomingMode = params.mode;
    if (isFocusMode(incomingMode) && incomingMode !== mode) {
      void selectMode(incomingMode);
    }
  }, [mode, params.mode, selectMode]);

  return (
    <LinearGradient
      colors={["#04070D", "#071327", "#09172A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.page}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.modePill}>{modeConfig.title.toUpperCase()}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>{modeConfig.title} Session</Text>
          <Text style={styles.subtitle}>{modeConfig.subtitle}</Text>
          <Text style={styles.timerValue}>{formatCountdown(isPlaying ? remainingSeconds : timerSeconds)}</Text>
        </View>

        <View style={styles.playArea}>
          <PlayButton isPlaying={isPlaying} disabled={isBusy} onPress={() => void togglePlayback()} />
          <Text style={styles.status}>{isPlaying ? "Playing continuously" : "Paused"}</Text>
        </View>

        <View style={styles.panel}>
          <TimerPills selectedSeconds={timerSeconds} onPick={setTimerMinutes} />
          <View style={styles.separator} />
          <VolumeControl value={volume} onChange={(next) => void setVolume(next)} />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.md
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 28, 48, 0.7)"
  },
  backText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600"
  },
  modePill: {
    color: theme.colors.accent2,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700"
  },
  hero: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  timerValue: {
    color: theme.colors.accent,
    fontSize: 30,
    fontWeight: "600",
    marginTop: theme.spacing.sm
  },
  playArea: {
    marginTop: 42,
    alignItems: "center",
    gap: theme.spacing.md
  },
  status: {
    color: theme.colors.muted,
    fontSize: 14
  },
  panel: {
    marginTop: 42,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(12, 22, 37, 0.8)",
    padding: theme.spacing.md,
    gap: theme.spacing.md
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(156, 191, 240, 0.2)"
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing.md,
    fontSize: 13,
    lineHeight: 18
  }
});

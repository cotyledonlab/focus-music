import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import type { ModeConfig } from "../constants/modes";
import { theme } from "../constants/theme";

type ModeCardProps = {
  mode: ModeConfig;
  selected: boolean;
  onPress: () => void;
};

export const ModeCard = ({ mode, selected, onPress }: ModeCardProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${mode.title} mode`}
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, selected && styles.wrapperSelected, pressed && styles.wrapperPressed]}
    >
      <LinearGradient
        colors={
          selected
            ? ["rgba(110, 210, 255, 0.25)", "rgba(58, 126, 255, 0.16)"]
            : ["rgba(115, 155, 226, 0.12)", "rgba(59, 87, 134, 0.06)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{mode.title}</Text>
          <View style={[styles.beatPill, selected && styles.beatPillSelected]}>
            <Text style={styles.beatText}>{mode.beatHz}Hz</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{mode.subtitle}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(104, 148, 214, 0.2)",
    overflow: "hidden"
  },
  wrapperSelected: {
    borderColor: theme.colors.accent
  },
  wrapperPressed: {
    transform: [{ scale: 0.985 }]
  },
  card: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 18,
    gap: theme.spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21
  },
  beatPill: {
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(122, 164, 225, 0.25)"
  },
  beatPillSelected: {
    backgroundColor: "rgba(91, 205, 255, 0.25)"
  },
  beatText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600"
  }
});

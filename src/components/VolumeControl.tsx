import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";

type VolumeControlProps = {
  value: number;
  onChange: (next: number) => void;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const VolumeControl = ({ value, onChange }: VolumeControlProps) => {
  const level = Math.round(value * 10);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Volume</Text>
        <Text style={styles.value}>{Math.round(value * 100)}%</Text>
      </View>

      <View style={styles.bodyRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lower volume"
          onPress={() => onChange(clamp(value - 0.1))}
          style={({ pressed }) => [styles.bumpButton, pressed && styles.bumpPressed]}
        >
          <Text style={styles.bumpText}>-</Text>
        </Pressable>

        <View style={styles.segments}>
          {Array.from({ length: 10 }, (_, index) => {
            const active = index < level;

            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Set volume to ${(index + 1) * 10} percent`}
                onPress={() => onChange((index + 1) / 10)}
                style={({ pressed }) => [styles.segment, active && styles.segmentActive, pressed && styles.segmentPressed]}
              />
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase volume"
          onPress={() => onChange(clamp(value + 0.1))}
          style={({ pressed }) => [styles.bumpButton, pressed && styles.bumpPressed]}
        >
          <Text style={styles.bumpText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600"
  },
  value: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  bumpButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14, 27, 45, 0.92)"
  },
  bumpPressed: {
    transform: [{ scale: 0.94 }]
  },
  bumpText: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "700",
    marginTop: -2
  },
  segments: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  segment: {
    flex: 1,
    minHeight: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(142, 181, 239, 0.35)",
    backgroundColor: "rgba(24, 39, 63, 0.75)"
  },
  segmentActive: {
    borderColor: "rgba(103, 200, 255, 0.7)",
    backgroundColor: "rgba(103, 200, 255, 0.34)"
  },
  segmentPressed: {
    opacity: 0.85
  }
});

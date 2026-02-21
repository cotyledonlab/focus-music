import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants/theme";

type TimerPillsProps = {
  selectedSeconds: number | null;
  onPick: (minutes: number | null) => void;
};

const options = [
  { label: "Off", minutes: null },
  { label: "25m", minutes: 25 },
  { label: "45m", minutes: 45 },
  { label: "90m", minutes: 90 }
];

export const TimerPills = ({ selectedSeconds, onPick }: TimerPillsProps) => {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected =
          option.minutes == null ? selectedSeconds == null : Math.round((selectedSeconds ?? 0) / 60) === option.minutes;

        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={`Set timer to ${option.label}`}
            onPress={() => onPick(option.minutes)}
            style={({ pressed }) => [styles.pill, selected && styles.pillSelected, pressed && styles.pillPressed]}
          >
            <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  pill: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18, 29, 48, 0.8)"
  },
  pillSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: "rgba(102, 194, 255, 0.18)"
  },
  pillPressed: {
    transform: [{ scale: 0.97 }]
  },
  pillText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "600"
  },
  pillTextSelected: {
    color: theme.colors.text
  }
});

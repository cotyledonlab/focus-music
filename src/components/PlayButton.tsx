import { Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "../constants/theme";

type PlayButtonProps = {
  isPlaying: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export const PlayButton = ({ isPlaying, disabled = false, onPress }: PlayButtonProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? "Pause playback" : "Start playback"}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && !disabled && styles.wrapperPressed, disabled && styles.wrapperDisabled]}
    >
      <LinearGradient
        colors={["#65CCFF", "#6B95FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.core}
      >
        <Text style={styles.label}>{isPlaying ? "Pause" : "Play"}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    shadowColor: "#4BC4FF",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12
  },
  wrapperPressed: {
    transform: [{ scale: 0.97 }]
  },
  wrapperDisabled: {
    opacity: 0.65
  },
  core: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    color: "#071629",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.4
  }
});

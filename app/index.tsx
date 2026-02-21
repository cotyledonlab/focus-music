import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { describeSongKey } from "../src/audio/composition";
import { ModeCard } from "../src/components/ModeCard";
import { MODE_ORDER, MODE_CONFIGS } from "../src/constants/modes";
import { theme } from "../src/constants/theme";
import { usePlayer } from "../src/hooks/usePlayer";

export default function HomeScreen() {
  const { mode, selectMode, favoriteSongs, loadSong } = usePlayer();

  return (
    <LinearGradient
      colors={[theme.colors.bg0, theme.colors.bg1, "#050910"]}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.page}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Generative Audio</Text>
          <Text style={styles.title}>Focus Music</Text>
          <Text style={styles.subtitle}>Adaptive binaural sessions for deep work, reset, and sleep.</Text>
        </View>

        <View style={styles.list}>
          {MODE_ORDER.map((key) => {
            const modeConfig = MODE_CONFIGS[key];

            return (
              <ModeCard
                key={modeConfig.id}
                mode={modeConfig}
                selected={modeConfig.id === mode}
                onPress={() => {
                  void selectMode(modeConfig.id);
                  router.push({
                    pathname: "/player",
                    params: { mode: modeConfig.id }
                  });
                }}
              />
            );
          })}
        </View>

        {favoriteSongs.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.favoritesTitle}>Favorite Songs</Text>
            <View style={styles.favoriteList}>
              {favoriteSongs.slice(0, 6).map((song) => (
                <Pressable
                  key={song.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Load ${song.name}`}
                  onPress={() => {
                    void loadSong(song);
                    router.push({ pathname: "/player", params: { mode: song.mode } });
                  }}
                  style={({ pressed }) => [styles.favoriteCard, pressed && styles.favoriteCardPressed]}
                >
                  <Text style={styles.favoriteName}>{song.name}</Text>
                  <Text style={styles.favoriteMeta}>
                    {song.mode.toUpperCase()} · {describeSongKey(song)} · {song.timbre}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  header: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.accent2,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2.2,
    fontWeight: "700"
  },
  title: {
    color: theme.colors.text,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "700",
    letterSpacing: 0.3
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340
  },
  list: {
    gap: theme.spacing.md
  },
  favoritesSection: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  favoritesTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  favoriteList: {
    gap: theme.spacing.sm
  },
  favoriteCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(102, 170, 255, 0.28)",
    backgroundColor: "rgba(15, 28, 48, 0.82)",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  favoriteCardPressed: {
    opacity: 0.82
  },
  favoriteName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600"
  },
  favoriteMeta: {
    marginTop: 3,
    color: theme.colors.muted,
    fontSize: 12
  }
});

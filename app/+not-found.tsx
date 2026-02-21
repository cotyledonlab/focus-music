import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../src/constants/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen not found.</Text>
      <Link href="/" style={styles.link}>
        Return home
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "600"
  },
  link: {
    color: theme.colors.accent,
    fontSize: 15
  }
});

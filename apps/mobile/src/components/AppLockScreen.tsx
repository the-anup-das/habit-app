import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { COLORS } from "@chapter/ui-tokens";

export function AppLockScreen({ onUnlock }: { onUnlock: (pin: string) => Promise<boolean> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handlePress = async (digit: string) => {
    if (error) setError(false);
    
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      const success = await onUnlock(newPin);
      if (!success) {
        setError(true);
        setPin("");
      }
    }
  };

  const handleBackspace = () => {
    if (error) setError(false);
    setPin(pin.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Locked</Text>

      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map(i => (
          <View 
            key={i}
            style={[
              styles.dot,
              { backgroundColor: pin.length > i ? COLORS.light.primary : COLORS.light.surface2 }
            ]}
          />
        ))}
      </View>

      <View style={{ height: 32, justifyContent: "center" }}>
        {error && <Text style={styles.errorText}>Incorrect PIN</Text>}
      </View>

      <View style={styles.pad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <TouchableOpacity
            key={d}
            onPress={() => handlePress(d.toString())}
            style={styles.key}
          >
            <Text style={styles.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity
          onPress={() => handlePress("0")}
          style={styles.key}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleBackspace}
          style={styles.key}
        >
          <Text style={styles.keyText}>⌫</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.light.background,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    color: COLORS.light.ink1,
    marginBottom: 48,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    color: "#ef4444",
  },
  pad: {
    width: 280,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.light.glass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  keyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 28,
    color: COLORS.light.ink1,
  }
});

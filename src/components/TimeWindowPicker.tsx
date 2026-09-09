import { Pressable, StyleSheet, Text, View } from "react-native";

import { selectionHaptic } from "../services/haptics";
import type { TimeWindow } from "../types/fire";
import { font } from "../theme/typography";

type TimeWindowPickerProps = {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
};

const options: Array<{ value: TimeWindow; label: string }> = [
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "5d", label: "5 days" },
];

export function TimeWindowPicker({ value, onChange }: TimeWindowPickerProps) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel="Observation time range">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                void selectionHaptic();
                onChange(option.value);
              }
            }}
            style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 8 },
  option: {
    backgroundColor: "#F0F4F1",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionSelected: { backgroundColor: "#14532D" },
  pressed: { opacity: 0.7 },
  label: { color: "#3F4A43", fontSize: 12, ...font("700") },
  labelSelected: { color: "#FFFFFF" },
});

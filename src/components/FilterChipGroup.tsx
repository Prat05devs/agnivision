import { ScrollView, Pressable, StyleSheet, Text } from "react-native";

import { selectionHaptic } from "../services/haptics";
import { font } from "../theme/typography";

type FilterChipGroupProps<T extends string> = {
  accessibilityLabel: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
};

export function FilterChipGroup<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: FilterChipGroupProps<T>) {
  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => {
        const selected = value === option.value;
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
            style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  chip: { backgroundColor: "#F0F4F1", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  selectedChip: { backgroundColor: "#14532D" },
  pressed: { opacity: 0.7 },
  label: { color: "#445149", fontSize: 12, ...font("700") },
  selectedLabel: { color: "#FFFFFF" },
});

import { StyleSheet, View } from "react-native";
import { formatHoursWord, formatMinutesWord } from "@/data/constants";
import { WheelPicker } from "@/components/WheelPicker";

const HOURS = Array.from({ length: 25 }, (_, h) => ({ value: h, label: formatHoursWord(h) }));
const MINUTES = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  return { value: m, label: formatMinutesWord(m) };
});

// Two independently scrollable wheels (hours 0–24, minutes 0/5/…/55 —
// always exactly these 5-minute steps, no other values ever appear as a
// row) driving a single "hours + minutes" duration (TASK_011). Conversion
// to/from total minutes, and normalizing legacy non-5-minute durations to
// the nearest step, is the caller's responsibility (SessionForm) — this
// component only renders and reports the two selected values.
export function DurationWheelPicker({
  hours,
  minutes,
  onChangeHours,
  onChangeMinutes,
}: {
  hours: number;
  minutes: number;
  onChangeHours: (hours: number) => void;
  onChangeMinutes: (minutes: number) => void;
}) {
  return (
    <View style={styles.row}>
      <WheelPicker items={HOURS} value={hours} onChange={onChangeHours} accessibilityLabel="Часы" />
      <WheelPicker items={MINUTES} value={minutes} onChange={onChangeMinutes} accessibilityLabel="Минуты" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
});

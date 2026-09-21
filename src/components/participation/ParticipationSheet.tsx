import { useContext, useEffect, useState } from "react";
import { Modal as RNModal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MonthCalendarModal } from "@/components/forms/MonthCalendarModal";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { CalendarIcon, CheckIcon, ChevronRightIcon } from "@/components/icons";
import { toISODate } from "@/data/constants";
import { formatDayLabelRu, isFutureDate } from "@/data/participation";
import { useStore } from "@/store/StoreContext";
import type { ServiceParticipation } from "@/types";
import { confirmAsync } from "@/utils/confirm";
import { useThemedStyles } from "@/theme";

// TASK_073 — the light bottom sheet behind «✓ Отметить служение».
//
//   Сегодня, 20 сентября
//   Дата  ▸ 20 сентября
//   ✓ Я участвовал в служении
//   [ Отметить ]
//
// Same base primitive as AddActionSheet / ProfileEditSheet (transparent
// RNModal, slide, dark backdrop, tap-outside-to-close), on Ministry's
// teal tokens. The date defaults to today and can be moved BACK (a
// forgotten day) via the existing MonthCalendarModal; a future day is
// refused here AND by the store. Marking an already-marked day is shown as
// «Уже отмечено» — never a second record.
//
// `existing` switches the sheet into edit mode for one record (journal /
// month details): the date can be moved, or the mark deleted.
export function ParticipationSheet({
  visible,
  onClose,
  initialDate,
  existing,
}: {
  visible: boolean;
  onClose: () => void;
  /** Create mode: the pre-selected day (defaults to today). */
  initialDate?: string;
  /** Edit mode: the record being changed. */
  existing?: ServiceParticipation;
}) {
  const styles = useThemedStyles(makeStyles);
  // Degrade-to-zero outside the app shell (component tests) — same rule as
  // useTabBarContentInset() / HomeDrawer.
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const { participation, markParticipation, updateParticipationDate, deleteParticipation } = useStore();
  const todayISO = toISODate(new Date());
  const [date, setDate] = useState(existing?.date ?? initialDate ?? todayISO);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Re-arm every time the sheet opens: fresh date, no stale hint.
  useEffect(() => {
    if (visible) {
      setDate(existing?.date ?? initialDate ?? toISODate(new Date()));
      setHint(null);
      setPickerOpen(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [visible, existing?.date, initialDate]);

  const editing = !!existing;
  const takenByOther = participation.some((p) => p.date === date && p.id !== existing?.id);
  const alreadyMarked = !editing && takenByOther;
  const unchanged = editing && date === existing.date;

  function pickDate(iso: string) {
    if (isFutureDate(iso, todayISO)) {
      setHint("Будущую дату выбрать нельзя");
      return;
    }
    setHint(null);
    setDate(iso);
    setPickerOpen(false);
  }

  function submit() {
    const r = editing ? updateParticipationDate(existing.id, date) : markParticipation(date);
    if (!r.ok) {
      setHint(
        r.error === "future"
          ? "Будущую дату выбрать нельзя"
          : r.error === "duplicate"
            ? "Этот день уже отмечен"
            : "Не удалось сохранить отметку",
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onClose();
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirmAsync("Удалить отметку?", "День перестанет считаться днём служения.");
    if (!ok) return;
    deleteParticipation(existing.id);
    onClose();
  }

  const title = formatDayLabelRu(date, todayISO);
  const primaryLabel = editing ? "Сохранить" : alreadyMarked ? "Уже отмечено" : "Отметить";
  const primaryDisabled = alreadyMarked || unchanged || takenByOther;

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть">
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(18, bottomInset) }]}
          onPress={(e) => e.stopPropagation()}
          testID="participation-sheet"
        >
          <View style={styles.grabber} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>

          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Дата: ${title}. Изменить`}
            style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}
            testID="participation-date-row"
          >
            <View style={styles.dateIcon}>
              <CalendarIcon size={18} color={MINISTRY.primary} />
            </View>
            <Text style={styles.dateLabel}>Дата</Text>
            <Text style={styles.dateValue}>{formatDayLabelRu(date, todayISO).replace(/^(Сегодня|Вчера), /, "")}</Text>
            <ChevronRightIcon size={16} color={DS.chevron} />
          </Pressable>

          <View style={styles.statusRow} accessibilityRole="text">
            <View style={[styles.check, (alreadyMarked || editing) && styles.checkOn]}>
              <CheckIcon size={16} color={alreadyMarked || editing ? "#fff" : MINISTRY.primary} />
            </View>
            <Text style={styles.statusText}>{alreadyMarked ? "Этот день уже отмечен" : "Я участвовал в служении"}</Text>
          </View>

          {hint ? (
            <Text style={styles.hint} accessibilityLiveRegion="polite">
              {hint}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={primaryDisabled}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            accessibilityState={{ disabled: primaryDisabled }}
            style={({ pressed }) => [styles.primary, primaryDisabled && styles.primaryDisabled, pressed && !primaryDisabled && styles.pressed]}
            testID="participation-submit"
          >
            {!alreadyMarked && <CheckIcon size={18} color="#fff" />}
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </Pressable>

          {editing && (
            <Pressable
              onPress={remove}
              accessibilityRole="button"
              accessibilityLabel="Удалить отметку"
              style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
              testID="participation-delete"
            >
              <Text style={styles.dangerText}>Удалить отметку</Text>
            </Pressable>
          )}

          <MonthCalendarModal visible={pickerOpen} selectedDate={date} onSelect={pickDate} onClose={() => setPickerOpen(false)} />
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const makeStyles = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,36,30,0.42)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: MINISTRY.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 12,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" } : {
      shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: -8 }, elevation: 12,
    }),
  },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: DS.segOff, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "700", color: MINISTRY.ink, letterSpacing: -0.2 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: MINISTRY.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  dateIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: MINISTRY.accentSoft, alignItems: "center", justifyContent: "center" },
  dateLabel: { fontSize: 15, fontWeight: "600", color: MINISTRY.ink2, flex: 1 },
  dateValue: { fontSize: 15, fontWeight: "700", color: MINISTRY.ink },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4, paddingVertical: 4 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MINISTRY.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: MINISTRY.accent, borderColor: MINISTRY.accent },
  statusText: { fontSize: 16, fontWeight: "600", color: MINISTRY.ink },
  hint: { fontSize: 13, fontWeight: "600", color: DS.danger, paddingHorizontal: 4 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MINISTRY.primary,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 4,
  },
  primaryDisabled: { backgroundColor: "rgba(15,111,92,0.35)" },
  primaryText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  danger: { alignItems: "center", paddingVertical: 12 },
  dangerText: { fontSize: 15, fontWeight: "600", color: DS.danger },
  pressed: { opacity: 0.8 },
});

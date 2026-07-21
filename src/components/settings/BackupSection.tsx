import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, formatDateDMY, toISODate } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { buildBackup, formatBackupFilename, validateBackupJSON, type MinistryBackup } from "@/data/backup";
import { performImport, readCurrentData, BackupImportError } from "@/data/backupImport";
import { pickBackupFile, saveBackupFile } from "@/data/backupFile";
import { Modal } from "@/components/Modal";
import { DangerButton, PrimaryButton } from "@/components/ui";
import { DownloadIcon, RefreshCwIcon } from "@/components/icons";
import { ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";

// Date portion via the app-wide canonical formatter (TASK_022) — was a
// locally-grown "DD.MM.YYYY" (dots); only the separator changes, the
// HH:MM time portion (irrelevant to that formatter) is untouched.
function formatBackupTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDateDMY(toISODate(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PLATFORM_UNSUPPORTED_MESSAGE =
  "Резервное копирование пока доступно только в веб-версии Ministry (Safari или установленное приложение на экране «Домой»).";

type Feedback = { kind: "success" | "error"; title: string; message: string };

// `last` (TASK_044) controls whether the second row ("Резервная копия")
// draws its bottom divider — false when the caller places another row
// (e.g. "Синхронизация") right after it inside the same card.
export function BackupSection({ last = true }: { last?: boolean } = {}) {
  const { records, events, talks, sessions, replaceAllData } = useStore();
  const [exporting, setExporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<MinistryBackup | null>(null);
  const [currentCounts, setCurrentCounts] = useState<MinistryBackup["counts"] | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // pickBackupFile's callbacks can fire well after this component would
  // otherwise have finished with a given pick attempt (delayed iOS `change`
  // — see backupFile.web.ts), including potentially after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleExport() {
    if (exporting) return;
    setFeedback(null);
    setExporting(true);
    try {
      const backup = buildBackup({ records, events, talks, sessions });
      const json = JSON.stringify(backup, null, 2);
      await saveBackupFile(formatBackupFilename(new Date(backup.createdAt)), json);
    } catch (e) {
      const message =
        e instanceof Error && e.message === "platform-unsupported"
          ? PLATFORM_UNSUPPORTED_MESSAGE
          : "Попробуйте ещё раз.";
      setFeedback({ kind: "error", title: "Не удалось создать резервную копию", message });
    } finally {
      setExporting(false);
    }
  }

  function handlePickImport() {
    if (picking || importing) return;
    setFeedback(null);
    setPicking(true);
    // Callback-based rather than awaited: on iOS the real `change` event can
    // arrive well after focus returns to the app (see backupFile.web.ts), so
    // this cannot be a single await/try/finally that ties the busy indicator
    // to one settlement point — `onCancelled` only relaxes the busy state,
    // it never discards a selection that shows up afterward.
    pickBackupFile({
      onSelected: async (json) => {
        if (!mountedRef.current) return;
        setPicking(false);
        const result = validateBackupJSON(json);
        if (!result.ok) {
          setFeedback({ kind: "error", title: "Не удалось импортировать", message: result.error });
          return;
        }
        const current = await readCurrentData();
        if (!mountedRef.current) return;
        setCurrentCounts({
          records: current.records.length,
          events: current.events.length,
          talks: current.talks.length,
          sessions: current.sessions.length,
        });
        setPreview(result.backup);
      },
      onError: (e) => {
        if (!mountedRef.current) return;
        setPicking(false);
        if (e.message === "no-file-selected") return; // treated the same as a cancel — no-op
        setFeedback({ kind: "error", title: "Не удалось выбрать файл", message: PLATFORM_UNSUPPORTED_MESSAGE });
      },
      onCancelled: () => {
        if (!mountedRef.current) return;
        setPicking(false); // silent — explicit cancel, or the focus-return heuristic
      },
    });
  }

  function handleCancelPreview() {
    if (importing) return;
    setPreview(null);
    setCurrentCounts(null);
  }

  async function handleConfirmImport() {
    if (!preview || importing) return;
    setImporting(true);
    try {
      // performImport writes + verifies on disk (validate-before-write,
      // snapshot/rollback — see backupImport.ts), then — as the final step
      // of that SAME transaction — calls replaceAllData to apply the
      // verified data to the live StoreContext. This is the fix for the
      // production bug: previously, success relied on react-native-web's
      // Alert.alert() calling an onPress callback that triggered
      // window.location.reload() — but Alert.alert is a total no-op on web
      // (react-native-web's implementation is an empty function), so that
      // callback never fired. The import silently wrote correct data to
      // storage while the already-mounted app kept rendering its stale
      // (pre-import) in-memory state forever, with no visible error and no
      // way to reach the new data short of the user manually reloading the
      // tab. Applying to context directly makes Home (and every other
      // screen — all of them read reactively from useStore(), never cache
      // records/events/talks/sessions locally) reflect the imported data
      // immediately, with no reload required. Routing the apply step
      // through performImport (rather than calling replaceAllData here
      // separately) means a failure there rolls back the storage write too
      // — storage and the live app can never end up disagreeing.
      await performImport(preview, replaceAllData);
      setPreview(null);
      setCurrentCounts(null);
      setFeedback({ kind: "success", title: "Импорт завершён", message: "Данные восстановлены." });
    } catch (e) {
      const message = e instanceof BackupImportError ? e.message : "Не удалось импортировать данные.";
      setFeedback({ kind: "error", title: "Импорт не выполнен", message });
    } finally {
      setImporting(false);
    }
  }

  const busy = exporting || picking || importing;

  return (
    <>
      <ProfileSettingsRow
        icon={DownloadIcon}
        title="Экспорт данных"
        subtitle="Сохранить копию данных приложения"
        accessibilityLabel="Экспортировать данные"
        onPress={handleExport}
        disabled={busy}
        busy={exporting}
        last={false}
      />
      <ProfileSettingsRow
        icon={RefreshCwIcon}
        title="Резервная копия"
        subtitle="Создать или восстановить копию данных"
        accessibilityLabel="Импортировать данные"
        onPress={handlePickImport}
        disabled={busy}
        busy={picking}
        last={last}
      />

      {feedback && (
        <View style={[styles.feedback, feedback.kind === "success" ? styles.feedbackSuccess : styles.feedbackError]}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.feedbackTitle,
                feedback.kind === "success" ? styles.feedbackSuccessText : styles.feedbackErrorText,
              ]}
            >
              {feedback.title}
            </Text>
            <Text
              style={[
                styles.feedbackMessage,
                feedback.kind === "success" ? styles.feedbackSuccessText : styles.feedbackErrorText,
              ]}
            >
              {feedback.message}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Закрыть сообщение" onPress={() => setFeedback(null)} hitSlop={8}>
            <Text
              style={[styles.feedbackClose, feedback.kind === "success" ? styles.feedbackSuccessText : styles.feedbackErrorText]}
            >
              ✕
            </Text>
          </Pressable>
        </View>
      )}

      <Modal visible={!!preview} title="Импорт резервной копии" onClose={handleCancelPreview}>
        {preview && (
          <View>
            <Text style={styles.warning}>
              Импорт заменит текущие данные Ministry на данные из резервной копии.
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Создана</Text>
              <Text style={styles.metaValue}>{formatBackupTimestamp(preview.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Версия формата</Text>
              <Text style={styles.metaValue}>{preview.version}</Text>
            </View>

            <View style={styles.countsTable}>
              <View style={styles.countsHeaderRow}>
                <Text style={[styles.countsCell, styles.countsHeaderText]}>Категория</Text>
                <Text style={[styles.countsCell, styles.countsHeaderText]}>Сейчас</Text>
                <Text style={[styles.countsCell, styles.countsHeaderText]}>В файле</Text>
              </View>
              {(
                [
                  ["Записи часов", "records"],
                  ["Сессии времени", "sessions"],
                  ["События", "events"],
                  ["Речи", "talks"],
                ] as const
              ).map(([label, key]) => (
                <View key={key} style={styles.countsRow}>
                  <Text style={styles.countsCell}>{label}</Text>
                  <Text style={styles.countsCell}>{currentCounts?.[key] ?? "—"}</Text>
                  <Text style={styles.countsCell}>{preview.counts[key]}</Text>
                </View>
              ))}
            </View>

            <View style={styles.previewButtonRow}>
              <PrimaryButton label="Отмена" onPress={handleCancelPreview} />
              <View style={{ width: 10 }} />
              {importing ? (
                <ActivityIndicator color={COLORS.danger} />
              ) : (
                <DangerButton label="Заменить данные" onPress={handleConfirmImport} />
              )}
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedback: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  feedbackSuccess: { backgroundColor: COLORS.greenBg },
  feedbackError: { backgroundColor: COLORS.dangerBg },
  feedbackTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  feedbackMessage: { fontSize: 13, lineHeight: 17 },
  feedbackSuccessText: { color: "#166534" },
  feedbackErrorText: { color: COLORS.danger },
  feedbackClose: { fontSize: 16, fontWeight: "700", paddingHorizontal: 2 },
  warning: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  metaLabel: { fontSize: 14, color: COLORS.muted },
  metaValue: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  countsTable: { marginTop: 8, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: "hidden" },
  countsHeaderRow: { flexDirection: "row", backgroundColor: COLORS.light, paddingVertical: 8 },
  countsRow: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  countsCell: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: "center" },
  countsHeaderText: { fontWeight: "700", color: COLORS.muted },
  previewButtonRow: { flexDirection: "row", alignItems: "center" },
});

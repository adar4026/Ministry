import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import { buildBackup, formatBackupFilename, validateBackupJSON, type MinistryBackup } from "@/data/backup";
import { performImport, readCurrentData, BackupImportError } from "@/data/backupImport";
import { pickBackupFile, saveBackupFile } from "@/data/backupFile";
import { Modal } from "@/components/Modal";
import { DangerButton, PrimaryButton } from "@/components/ui";

function formatBackupTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PLATFORM_UNSUPPORTED_MESSAGE =
  "Резервное копирование пока доступно только в веб-версии Ministry (Safari или установленное приложение на экране «Домой»).";

type Feedback = { kind: "success" | "error"; title: string; message: string };

export function BackupSection() {
  const { records, events, talks, sessions, replaceAllData } = useStore();
  const [exporting, setExporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<MinistryBackup | null>(null);
  const [currentCounts, setCurrentCounts] = useState<MinistryBackup["counts"] | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

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

  async function handlePickImport() {
    if (picking || importing) return;
    setFeedback(null);
    setPicking(true);
    try {
      const json = await pickBackupFile();
      const result = validateBackupJSON(json);
      if (!result.ok) {
        setFeedback({ kind: "error", title: "Не удалось импортировать", message: result.error });
        return;
      }
      const current = await readCurrentData();
      setCurrentCounts({
        records: current.records.length,
        events: current.events.length,
        talks: current.talks.length,
        sessions: current.sessions.length,
      });
      setPreview(result.backup);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "no-file-selected" || message === "cancelled") return; // user cancelled — no-op
      setFeedback({ kind: "error", title: "Не удалось выбрать файл", message: PLATFORM_UNSUPPORTED_MESSAGE });
    } finally {
      setPicking(false);
    }
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
    <View style={styles.container}>
      <Text style={styles.description}>
        Создайте резервную копию, чтобы перенести данные между Safari и приложением на экране «Домой» или
        восстановить их позже.
      </Text>

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

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Экспортировать данные"
          disabled={busy}
          onPress={handleExport}
          style={({ pressed }) => [styles.exportBtn, (pressed || busy) && styles.pressed]}
        >
          {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportBtnText}>Экспортировать данные</Text>}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Импортировать данные"
          disabled={busy}
          onPress={handlePickImport}
          style={({ pressed }) => [styles.importBtn, (pressed || busy) && styles.pressed]}
        >
          {picking ? (
            <ActivityIndicator color={COLORS.blue} />
          ) : (
            <Text style={styles.importBtnText}>Импортировать данные</Text>
          )}
        </Pressable>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  description: { fontSize: 12, color: COLORS.muted, marginBottom: 12, lineHeight: 17 },
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
  feedbackTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  feedbackMessage: { fontSize: 12, lineHeight: 16 },
  feedbackSuccessText: { color: "#166534" },
  feedbackErrorText: { color: COLORS.danger },
  feedbackClose: { fontSize: 16, fontWeight: "700", paddingHorizontal: 2 },
  buttonRow: { flexDirection: "row", gap: 10, paddingBottom: 4 },
  exportBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  exportBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  importBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  importBtnText: { color: COLORS.blue, fontWeight: "700", fontSize: 13 },
  pressed: { opacity: 0.7 },
  warning: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  metaLabel: { fontSize: 13, color: COLORS.muted },
  metaValue: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  countsTable: { marginTop: 8, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: "hidden" },
  countsHeaderRow: { flexDirection: "row", backgroundColor: COLORS.light, paddingVertical: 8 },
  countsRow: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  countsCell: { flex: 1, fontSize: 12, color: COLORS.text, textAlign: "center" },
  countsHeaderText: { fontWeight: "700", color: COLORS.muted },
  previewButtonRow: { flexDirection: "row", alignItems: "center" },
});

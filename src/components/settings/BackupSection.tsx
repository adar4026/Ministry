// "Данные и резервные копии" (TASK_013, redesigned in TASK_062).
//
// Three distinct actions, in increasing order of consequence:
//   Экспорт данных        — readable .json snapshot, for keeping/inspecting
//   Создать резервную копию — full .mfb backup file (v2, checksummed)
//   Восстановить из копии  — destructive; danger-toned, always previewed first
//
// Nothing here touches the device's data until the owner confirms in the
// preview sheet, and the restore itself is snapshot-and-rollback protected
// in src/data/backupImport.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORY_KEYS, COLORS, formatDateDMY, toISODate } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import {
  BACKUP_FILE_EXTENSION,
  buildBackup,
  formatBackupFilename,
  formatExportFilename,
  validateBackupJSON,
  type BackupValidationResult,
  type MinistryBackupCounts,
  type MinistryBackupData,
} from "@/data/backup";
import {
  BackupImportError,
  markBackupCreated,
  performImport,
  readCurrentData,
  readLastBackupAt,
} from "@/data/backupImport";
import { pickBackupFile, saveBackupFile } from "@/data/backupFile";
import { Modal } from "@/components/Modal";
import { DangerButton, PrimaryButton } from "@/components/ui";
import { DownloadIcon, RotateCcwIcon, ShieldIcon } from "@/components/icons";
import { ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";
import { DS } from "@/components/dashboard";

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

const REPLACE_WARNING =
  "Все текущие данные Ministry на этом устройстве будут заменены данными из копии.";

// How many field-level problems the sheet lists before summarising the rest.
const MAX_SHOWN_ISSUES = 6;

type Feedback = { kind: "success" | "error"; title: string; message: string };
type Preview = { result: BackupValidationResult; currentCounts: MinistryBackupCounts };

function countsOf(data: MinistryBackupData): MinistryBackupCounts {
  return {
    records: data.records.length,
    events: data.events.length,
    talks: data.talks.length,
    sessions: data.sessions.length,
    customCategories: data.customCategories?.length ?? 0,
  };
}

// `last` (TASK_044) controls whether the final row draws its bottom divider
// — false when the caller places another row (e.g. "Синхронизация") right
// after it inside the same card.
export function BackupSection({ last = true }: { last?: boolean } = {}) {
  const { records, events, talks, sessions, profile, customCategories, replaceAllData } = useStore();
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [picking, setPicking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // pickBackupFile's callbacks can fire well after this component would
  // otherwise have finished with a given pick attempt (delayed iOS `change`
  // — see backupFile.web.ts), including potentially after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    readLastBackupAt()
      .then((iso) => {
        if (mountedRef.current) setLastBackupAt(iso);
      })
      .catch(() => {});
  }, []);

  const snapshot = useCallback(
    (): MinistryBackupData => ({ records, events, talks, sessions, customCategories, profile }),
    [records, events, talks, sessions, customCategories, profile],
  );

  // Both file actions write the SAME v2 payload — only the name, extension
  // and formatting differ. The checksum is computed over the canonical form
  // of the parsed object (see sha256.ts), so pretty-printing the export
  // cannot invalidate it.
  async function writeFile(kind: "export" | "backup") {
    const busyFlag = kind === "export" ? setExporting : setBackingUp;
    setFeedback(null);
    busyFlag(true);
    try {
      const now = new Date();
      const backup = buildBackup(snapshot(), now);
      if (kind === "export") {
        await saveBackupFile(formatExportFilename(now), JSON.stringify(backup, null, 2), "application/json");
      } else {
        await saveBackupFile(
          formatBackupFilename(now),
          JSON.stringify(backup),
          "application/octet-stream",
        );
        await markBackupCreated(now);
        if (mountedRef.current) setLastBackupAt(now.toISOString());
      }
    } catch (e) {
      const message =
        e instanceof Error && e.message === "platform-unsupported"
          ? PLATFORM_UNSUPPORTED_MESSAGE
          : "Попробуйте ещё раз.";
      setFeedback({
        kind: "error",
        title: kind === "export" ? "Не удалось экспортировать данные" : "Не удалось создать резервную копию",
        message,
      });
    } finally {
      if (mountedRef.current) busyFlag(false);
    }
  }

  function handlePickRestore() {
    if (picking || restoring) return;
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
        // Validation and the count of what's already here happen BEFORE
        // anything is shown, and long before anything is written.
        const result = validateBackupJSON(json, CATEGORY_KEYS);
        const current = await readCurrentData();
        if (!mountedRef.current) return;
        setPreview({ result, currentCounts: countsOf(current) });
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

  function handleClosePreview() {
    if (restoring) return;
    setPreview(null);
  }

  async function handleConfirmRestore() {
    if (!preview?.result.ok || restoring) return;
    const backup = preview.result.backup;
    setRestoring(true);
    try {
      // performImport writes a durable safety copy, writes + verifies on disk
      // (byte equality AND entity counts, with snapshot/rollback — see
      // backupImport.ts), then — as the final step of that SAME transaction
      // — calls replaceAllData to apply the verified data to the live
      // StoreContext. Routing the apply step through performImport (rather
      // than calling replaceAllData separately here) means a failure there
      // rolls back the storage write too, so storage and the live app can
      // never end up disagreeing. This is also the TASK_013 production-bug
      // fix: success used to depend on Alert.alert()'s onPress callback,
      // which is a no-op on react-native-web, so the restored data never
      // reached the mounted screens.
      await performImport(backup, replaceAllData);
      setPreview(null);
      setFeedback({
        kind: "success",
        title: "Данные восстановлены",
        message: `Записи часов: ${backup.counts.records} · события: ${backup.counts.events} · речи: ${backup.counts.talks} · сессии: ${backup.counts.sessions}.`,
      });
    } catch (e) {
      const message = e instanceof BackupImportError ? e.message : "Не удалось восстановить данные.";
      setFeedback({ kind: "error", title: "Восстановление не выполнено", message });
    } finally {
      if (mountedRef.current) setRestoring(false);
    }
  }

  const busy = exporting || backingUp || picking || restoring;
  const result = preview?.result;
  const fileCounts = result?.ok ? result.backup.counts : null;

  return (
    <>
      <ProfileSettingsRow
        icon={DownloadIcon}
        title="Экспорт данных"
        subtitle="Читаемый файл JSON со всеми данными"
        accessibilityLabel="Экспортировать данные"
        onPress={() => writeFile("export")}
        disabled={busy}
        busy={exporting}
        last={false}
      />
      <ProfileSettingsRow
        icon={ShieldIcon}
        title="Создать резервную копию"
        subtitle={`Полный файл ${BACKUP_FILE_EXTENSION} с контрольной суммой`}
        accessibilityLabel="Создать резервную копию"
        onPress={() => writeFile("backup")}
        disabled={busy}
        busy={backingUp}
        last={false}
      />
      <ProfileSettingsRow
        icon={RotateCcwIcon}
        title="Восстановить из копии"
        subtitle="Заменяет все данные на этом устройстве"
        accessibilityLabel="Восстановить из копии"
        tone="danger"
        onPress={handlePickRestore}
        disabled={busy}
        busy={picking}
        // The "Последняя копия" line below carries the divider instead, so the
        // two never stack into a double hairline.
        last
      />
      <View style={[styles.lastBackup, !last && styles.lastBackupDivider]}>
        <Text style={styles.lastBackupText}>
          {lastBackupAt
            ? `Последняя копия: ${formatBackupTimestamp(lastBackupAt)}`
            : "Резервная копия ещё не создавалась"}
        </Text>
      </View>

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

      <Modal visible={!!preview} title="Восстановление из копии" onClose={handleClosePreview}>
        {result && (
          <View>
            <View style={[styles.status, result.ok ? styles.statusOk : styles.statusError]}>
              <Text style={[styles.statusText, result.ok ? styles.statusOkText : styles.statusErrorText]}>
                {result.ok ? "Копия готова к восстановлению" : result.error}
              </Text>
            </View>

            {!result.ok && result.issues.length > 0 && (
              <View style={styles.issues}>
                {result.issues.slice(0, MAX_SHOWN_ISSUES).map((issue, i) => (
                  <Text
                    key={`${issue.entity}-${issue.index}-${issue.field ?? i}`}
                    style={styles.issueText}
                  >{`• ${issue.message}`}</Text>
                ))}
                {result.issues.length > MAX_SHOWN_ISSUES && (
                  <Text style={styles.issueText}>{`• …и ещё ${result.issues.length - MAX_SHOWN_ISSUES}.`}</Text>
                )}
                <Text style={styles.issueFooter}>Текущие данные не изменены.</Text>
              </View>
            )}

            {result.ok && (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Создана</Text>
                  <Text style={styles.metaValue}>{formatBackupTimestamp(result.backup.createdAt)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Формат</Text>
                  <Text style={styles.metaValue}>
                    {result.sourceVersion === 1
                      ? "Версия 1 (старая, совместимая)"
                      : `Версия 2 (${BACKUP_FILE_EXTENSION})`}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Приложение</Text>
                  <Text style={styles.metaValue}>{result.backup.appVersion}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Контрольная сумма</Text>
                  <Text style={styles.metaValue}>
                    {result.checksum === "verified" ? "Проверена" : "Нет (у версии 1 её и не бывает)"}
                  </Text>
                </View>

                <View style={styles.countsTable}>
                  <View style={styles.countsHeaderRow}>
                    <Text style={[styles.countsCell, styles.countsHeaderText]}>Категория</Text>
                    <Text style={[styles.countsCell, styles.countsHeaderText]}>Сейчас</Text>
                    <Text style={[styles.countsCell, styles.countsHeaderText]}>В копии</Text>
                  </View>
                  {(
                    [
                      ["Записи часов", "records"],
                      ["Сессии времени", "sessions"],
                      ["События", "events"],
                      ["Речи", "talks"],
                      ...(result.backup.data.customCategories ? ([["Темы событий", "customCategories"]] as const) : []),
                    ] as const
                  ).map(([label, key]) => (
                    <View key={key} style={styles.countsRow}>
                      <Text style={styles.countsCell}>{label}</Text>
                      <Text style={styles.countsCell}>{preview!.currentCounts[key]}</Text>
                      <Text style={styles.countsCell}>{fileCounts![key]}</Text>
                    </View>
                  ))}
                </View>

                {result.notes.length > 0 && (
                  <View style={styles.notes}>
                    {result.notes.map((note) => (
                      <Text key={note} style={styles.noteText}>{`• ${note}`}</Text>
                    ))}
                  </View>
                )}

                <Text style={styles.warning}>{REPLACE_WARNING}</Text>
              </>
            )}

            <View style={styles.previewButtonRow}>
              <PrimaryButton label={result.ok ? "Отмена" : "Закрыть"} onPress={handleClosePreview} />
              {result.ok && <View style={{ width: 10 }} />}
              {result.ok &&
                (restoring ? (
                  <ActivityIndicator color={COLORS.danger} />
                ) : (
                  <DangerButton label="Восстановить" onPress={handleConfirmRestore} />
                ))}
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  lastBackup: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 12 },
  lastBackupDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider },
  lastBackupText: { fontSize: 12, color: DS.subInk },
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
  status: { padding: 12, borderRadius: 8, marginBottom: 16 },
  statusOk: { backgroundColor: COLORS.greenBg },
  statusError: { backgroundColor: COLORS.dangerBg },
  statusText: { fontSize: 14, fontWeight: "700", lineHeight: 19 },
  statusOkText: { color: "#166534" },
  statusErrorText: { color: COLORS.danger },
  issues: { marginBottom: 18 },
  issueText: { fontSize: 13, lineHeight: 18, color: COLORS.text, marginBottom: 4 },
  issueFooter: { fontSize: 13, lineHeight: 18, color: COLORS.muted, marginTop: 6 },
  warning: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  metaLabel: { fontSize: 14, color: COLORS.muted },
  metaValue: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: COLORS.text, textAlign: "right" },
  countsTable: { marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: "hidden" },
  countsHeaderRow: { flexDirection: "row", backgroundColor: COLORS.light, paddingVertical: 8 },
  countsRow: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  countsCell: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: "center" },
  countsHeaderText: { fontWeight: "700", color: COLORS.muted },
  notes: { marginBottom: 16 },
  noteText: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginBottom: 3 },
  previewButtonRow: { flexDirection: "row", alignItems: "center" },
});

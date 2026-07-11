import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { RecordForm } from "@/components/forms/RecordForm";
import { COLORS, MN, byYearMonth, groupBySY } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { HourRecord } from "@/types";

const LOW_YEAR = 300; // service-year total below this is highlighted

function monthColor(hours: number): string {
  if (hours >= 70) return "#dbeafe";
  if (hours >= 40) return COLORS.light;
  return "#fef9c3";
}

export default function HoursScreen() {
  const { records, saveRecord, deleteRecord } = useStore();
  const [editRec, setEditRec] = useState<HourRecord | null>(null);

  const groups = useMemo(() => groupBySY(records), [records]);
  const maxH = useMemo(() => Math.max(1, ...groups.map((g) => g.total)), [groups]);

  function confirmDelete(id: string) {
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteRecord(id); setEditRec(null); } },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Часы по служебным годам</SectionTitle>
        {groups.map((g) => {
          const pct = Math.round((g.total / maxH) * 100);
          const low = g.total < LOW_YEAR;
          return (
            <View key={g.sy} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.sy}>{g.sy}</Text>
                <Text style={[styles.total, { color: low ? COLORS.warn : COLORS.blue }]}>
                  {g.total} ч.
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${pct}%`, backgroundColor: low ? COLORS.warn : COLORS.accent },
                  ]}
                />
              </View>
              <View style={styles.months}>
                {[...g.records].sort(byYearMonth).map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => setEditRec(r)}
                    style={[styles.month, { backgroundColor: monthColor(r.hours) }]}
                  >
                    <Text style={styles.monthText}>
                      {MN[r.month - 1]}: {r.hours}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </Card>

      <Modal visible={editRec !== null} title="Редактировать запись" onClose={() => setEditRec(null)}>
        {editRec && (
          <RecordForm
            initial={editRec}
            onSave={(input) => { saveRecord(input); setEditRec(null); }}
            onDelete={() => confirmDelete(editRec.id)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  group: { marginBottom: 16 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sy: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  total: { fontSize: 12, fontWeight: "700" },
  track: { backgroundColor: "#f1f5f9", borderRadius: 6, height: 10, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  months: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 6 },
  month: { paddingVertical: 2, paddingHorizontal: 5, borderRadius: 5, borderWidth: 1, borderColor: COLORS.border },
  monthText: { fontSize: 9, color: COLORS.text },
});

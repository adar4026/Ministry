import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { ChipSelector, TextField } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { EventForm } from "@/components/forms/EventForm";
import { CAT, CATEGORY_KEYS, COLORS, timeElapsed } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { MinistryEvent } from "@/types";

const FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  ...CATEGORY_KEYS.map((k) => ({ value: k as string, label: CAT[k].label })),
];

export default function TimelineScreen() {
  const { events, saveEvent, deleteEvent } = useStore();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editEv, setEditEv] = useState<MinistryEvent | null>(null);

  const filtered = useMemo(
    () =>
      events
        .filter((e) => filter === "all" || e.category === filter)
        .filter((e) => !query || e.title.toLowerCase().includes(query.toLowerCase()))
        // Newest first; filter/search predicates above are unchanged.
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events, filter, query],
  );

  function confirmDelete(id: string) {
    Alert.alert("Удалить событие?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteEvent(id); setEditEv(null); } },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Поиск..."
        style={styles.search}
      />
      <View style={styles.filter}>
        <ChipSelector options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </View>

      <View style={styles.timeline}>
        <View style={styles.rail} />
        {filtered.map((ev) => {
          const c = CAT[ev.category] ?? CAT.other;
          return (
            <View key={ev.id} style={styles.row}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: c.dot, borderColor: c.dot }]} />
              </View>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{ev.title}</Text>
                  <View style={styles.cardActions}>
                    <Badge category={ev.category} />
                    <Pressable onPress={() => setEditEv(ev)} hitSlop={8}>
                      <Text style={styles.edit}>✏</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.date}>{ev.date}</Text>
                <Text style={styles.elapsed}>{timeElapsed(ev.date)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={editEv !== null} title="Редактировать событие" onClose={() => setEditEv(null)}>
        {editEv && (
          <EventForm
            initial={editEv}
            onSave={(input) => { saveEvent(input); setEditEv(null); }}
            onDelete={() => confirmDelete(editEv.id)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  search: { marginBottom: 10 },
  filter: { marginBottom: 14 },
  timeline: { position: "relative" },
  rail: { position: "absolute", left: 14, top: 4, bottom: 4, width: 2, backgroundColor: COLORS.border },
  row: { flexDirection: "row", gap: 14, marginBottom: 14 },
  dotCol: { width: 30, alignItems: "center", paddingTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  title: { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.text },
  edit: { fontSize: 14, color: COLORS.muted },
  date: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  elapsed: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
});

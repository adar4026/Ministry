import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TalkForm } from "@/components/forms/TalkForm";
import { TalkRow } from "@/components/TalkRow";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { Talk } from "@/types";

// `editing` holds the talk being edited, or `"new"` for the add form, or null.
type Editing = Talk | "new" | null;

export default function TalksScreen() {
  const { talks, saveTalk, deleteTalk } = useStore();
  const [editing, setEditing] = useState<Editing>(null);

  const sorted = useMemo(
    () => [...talks].sort((a, b) => b.date.localeCompare(a.date)),
    [talks],
  );

  function confirmDelete(id: string) {
    Alert.alert("Удалить речь?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteTalk(id); setEditing(null); } },
    ]);
  }

  const editingTalk = editing && editing !== "new" ? editing : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.head}>
          <View>
            <Text style={styles.title}>Публичные речи</Text>
            <Text style={styles.count}>Всего: {talks.length}</Text>
          </View>
          <Pressable
            onPress={() => setEditing("new")}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.addBtnText}>+ Добавить</Text>
          </Pressable>
        </View>
        {sorted.map((t) => (
          <TalkRow key={t.id} talk={t} onPress={() => setEditing(t)} />
        ))}
      </Card>

      <Modal
        visible={editing !== null}
        title={editingTalk ? "Редактировать речь" : "Добавить речь"}
        onClose={() => setEditing(null)}
      >
        <TalkForm
          initial={editingTalk}
          onSave={(input) => { saveTalk(input); setEditing(null); }}
          onDelete={editingTalk ? () => confirmDelete(editingTalk.id) : undefined}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  count: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  addBtn: { backgroundColor: COLORS.blue, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

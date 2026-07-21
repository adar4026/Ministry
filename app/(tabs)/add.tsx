import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { RecordForm } from "@/components/forms/RecordForm";
import { EventForm } from "@/components/forms/EventForm";
import { TalkForm } from "@/components/forms/TalkForm";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

export default function AddScreen() {
  const { sessions, customCategories, saveRecord, saveEvent, saveTalk } = useStore();
  // TASK_045 — the "События" screen's "＋ Добавить событие" action links
  // here as `/add?focus=event` (same pattern as `/entry?id=…` elsewhere) to
  // land directly in event-creation mode, with no intermediate record-type
  // choice: only the event card renders, the other two are skipped rather
  // than requiring a scroll past them. Reached via the tab bar's "+" (no
  // param), all three cards render exactly as before.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const eventOnly = focus === "event";
  // Bumping a key remounts the form, clearing its fields after a successful add.
  const [recKey, setRecKey] = useState(0);
  const [evKey, setEvKey] = useState(0);
  const [talkKey, setTalkKey] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {eventOnly && (
        <View style={styles.header}>
          {/* TASK_045A — alwaysReplace: "add" and "timeline" are sibling
              Tabs.Screen routes, not nested in a shared Stack, so back()'s
              history pop lands wherever the tab bar was before it switched
              to "Мероприятия" (that switch itself never pushed a history
              entry) — not on "Мероприятия" itself. See BackButton.tsx. */}
          <BackButton fallbackHref="/timeline" alwaysReplace />
        </View>
      )}

      {!eventOnly && (
        <Card>
          <Text style={styles.title}>Добавить месяц (часы)</Text>
          <Text style={styles.hint}>Запишите часы за конкретный месяц</Text>
          <RecordForm
            key={`rec-${recKey}`}
            sessions={sessions}
            onSave={(input) => {
              saveRecord(input);
              setRecKey((k) => k + 1);
              Alert.alert("Готово", "Запись о часах добавлена.");
            }}
          />
        </Card>
      )}

      <Card>
        <Text style={styles.title}>Добавить событие</Text>
        <Text style={styles.hint}>Переезд, назначение, школа и т.д.</Text>
        <EventForm
          key={`ev-${evKey}`}
          customCategories={customCategories}
          onSave={(input) => {
            saveEvent(input);
            setEvKey((k) => k + 1);
            Alert.alert("Готово", "Событие добавлено.");
          }}
        />
      </Card>

      {!eventOnly && (
        <Card>
          <Text style={styles.title}>Добавить речь</Text>
          <Text style={styles.hint}>Публичная речь с номером и датой</Text>
          <TalkForm
            key={`talk-${talkKey}`}
            onSave={(input) => {
              saveTalk(input);
              setTalkKey((k) => k + 1);
              Alert.alert("Готово", "Речь добавлена.");
            }}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  header: { height: 44 },
  title: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  hint: { fontSize: 13, color: COLORS.muted, marginBottom: 16 },
});

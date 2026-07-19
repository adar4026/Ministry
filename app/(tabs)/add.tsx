import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { Card } from "@/components/ui";
import { RecordForm } from "@/components/forms/RecordForm";
import { EventForm } from "@/components/forms/EventForm";
import { TalkForm } from "@/components/forms/TalkForm";
import { COLORS } from "@/data/constants";
import { useStore } from "@/store/StoreContext";

export default function AddScreen() {
  const { sessions, saveRecord, saveEvent, saveTalk } = useStore();
  // Bumping a key remounts the form, clearing its fields after a successful add.
  const [recKey, setRecKey] = useState(0);
  const [evKey, setEvKey] = useState(0);
  const [talkKey, setTalkKey] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
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

      <Card>
        <Text style={styles.title}>Добавить событие</Text>
        <Text style={styles.hint}>Переезд, назначение, школа и т.д.</Text>
        <EventForm
          key={`ev-${evKey}`}
          onSave={(input) => {
            saveEvent(input);
            setEvKey((k) => k + 1);
            Alert.alert("Готово", "Событие добавлено.");
          }}
        />
      </Card>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  hint: { fontSize: 13, color: COLORS.muted, marginBottom: 16 },
});

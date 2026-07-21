import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { TextField } from "@/components/ui";
import { COLORS, uid } from "@/data/constants";
import { formatDateDMY } from "@/data/dateFormat";
import { confirmAsync } from "@/utils/confirm";
import { pickProfilePhoto } from "@/utils/profilePhoto";
import { commitProfilePhoto } from "@/utils/profilePhotoStorage";
import { ProfileEventForm, type ProfileEventFormInput } from "./ProfileEventForm";
import type { ProfileInput } from "@/store/StoreContext";
import type { ProfileEvent, UserProfile } from "@/types";

const MAX_EVENTS = 3;
const NAME_MAX_LENGTH = 60;

// A full-width, rounded, bordered row with an optional chevron — the single
// visual building block behind every action in this sheet (photo actions,
// each event, "+ Добавить событие"), matching the A-Lex Finance profile
// screen's row style this editor is modeled on (see
// docs/TASKS/TASK_042_PROFILE_HERO_CARD.md for the reference measurements:
// 13–14px radius, 1px very-light border, a chevron pinned to the right).
function ActionRow({
  onPress,
  children,
  chevron = true,
  accessibilityLabel,
  textStyle,
}: {
  onPress: () => void;
  children: string;
  chevron?: boolean;
  accessibilityLabel: string;
  textStyle?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={[styles.rowText, textStyle]} numberOfLines={1}>
        {children}
      </Text>
      {chevron ? <Text style={styles.rowChevron}>›</Text> : null}
    </Pressable>
  );
}

// Profile hero card's editor (TASK_042 revision) — a large bottom sheet
// modeled visually on A-Lex Finance's own profile screen (white surface,
// rounded top-only corners, dark backdrop, big left-aligned title + circular
// light-gray close button, safe-area-aware). A local draft
// (name/photo/events) is seeded from `profile` every time the sheet opens
// and only committed to the store via `onSave` when "Готово" is pressed —
// closing via the close button or the backdrop discards the draft.
export function ProfileEditSheet({
  visible,
  profile,
  onSave,
  onClose,
}: {
  visible: boolean;
  profile: UserProfile;
  onSave: (input: ProfileInput) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile.displayName ?? "");
  const [photoUri, setPhotoUri] = useState(profile.profilePhotoUri);
  const [events, setEvents] = useState<ProfileEvent[]>(profile.events);
  const [eventEditor, setEventEditor] = useState<{ event?: ProfileEvent } | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(profile.displayName ?? "");
      setPhotoUri(profile.profilePhotoUri);
      setEvents(profile.events);
      setEventEditor(null);
      setPhotoError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handlePickPhoto() {
    setPhotoError(null);
    pickProfilePhoto({
      onSelected: (uri) => setPhotoUri(uri),
      onError: () => setPhotoError("Не удалось выбрать фотографию. Попробуйте снова."),
      onCancelled: () => {},
    });
  }

  function handleSaveEvent(input: ProfileEventFormInput) {
    setEvents((es) => {
      if (input.id) {
        return es.map((e) => (e.id === input.id ? { ...e, title: input.title, date: input.date } : e));
      }
      if (es.length >= MAX_EVENTS) return es;
      return [...es, { id: uid(), title: input.title, date: input.date }];
    });
    setEventEditor(null);
  }

  async function handleDeleteEvent(id: string) {
    const ok = await confirmAsync("Удалить событие?", "Это действие нельзя отменить.");
    if (!ok) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    setEventEditor(null);
  }

  async function handleDone() {
    if (saving) return;
    setSaving(true);
    setPhotoError(null);
    try {
      let finalPhotoUri = photoUri;
      if (photoUri !== profile.profilePhotoUri) {
        finalPhotoUri = await commitProfilePhoto(photoUri, profile.profilePhotoUri);
      }
      onSave({ displayName: name, profilePhotoUri: finalPhotoUri, events });
      onClose();
    } catch {
      setPhotoError("Не удалось сохранить фотографию. Попробуйте снова.");
    } finally {
      setSaving(false);
    }
  }

  const initials = name.trim()[0]?.toUpperCase();

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть редактор профиля">
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Профиль</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.photoNameRow}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Фотография профиля" />
              ) : (
                <Avatar size={64} initials={initials} />
              )}
              <TextField
                value={name}
                onChangeText={setName}
                placeholder="Ваше имя"
                maxLength={NAME_MAX_LENGTH}
                accessibilityLabel="Имя"
                style={styles.nameInput}
              />
            </View>

            <ActionRow
              onPress={handlePickPhoto}
              accessibilityLabel={photoUri ? "Сменить фото" : "Добавить фото"}
            >
              {photoUri ? "📷 Сменить фото" : "📷 Добавить фото"}
            </ActionRow>

            {photoUri ? (
              <ActionRow
                onPress={() => setPhotoUri(undefined)}
                chevron={false}
                accessibilityLabel="Удалить фотографию"
                textStyle={styles.dangerText}
              >
                🗑 Удалить фото
              </ActionRow>
            ) : null}

            {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}

            <Text style={styles.sectionLabel}>События</Text>
            {events.map((ev) => (
              <ActionRow
                key={ev.id}
                onPress={() => setEventEditor({ event: ev })}
                accessibilityLabel={`Редактировать событие: ${ev.title}`}
              >
                {`${ev.title}  ·  ${formatDateDMY(ev.date)}`}
              </ActionRow>
            ))}

            {events.length < MAX_EVENTS ? (
              <ActionRow onPress={() => setEventEditor({})} accessibilityLabel="Добавить событие">
                + Добавить событие
              </ActionRow>
            ) : (
              <Text style={styles.maxReached}>Добавлено максимальное количество событий</Text>
            )}

            <Pressable
              onPress={handleDone}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Сохранить"
              style={({ pressed }) => [styles.doneBtn, (pressed || saving) && styles.rowPressed]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.doneBtnText}>Готово</Text>}
            </Pressable>
          </ScrollView>

          <RNModal
            visible={eventEditor !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setEventEditor(null)}
          >
            <Pressable style={styles.backdrop} onPress={() => setEventEditor(null)}>
              <Pressable style={styles.eventModalSheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.header}>
                  <Text style={styles.title}>{eventEditor?.event ? "Редактировать событие" : "Добавить событие"}</Text>
                  <Pressable
                    onPress={() => setEventEditor(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Закрыть"
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </Pressable>
                </View>
                {eventEditor ? (
                  <ProfileEventForm
                    initial={eventEditor.event}
                    onSave={handleSaveEvent}
                    onDelete={eventEditor.event ? () => handleDeleteEvent(eventEditor.event!.id) : undefined}
                  />
                ) : null}
              </Pressable>
            </Pressable>
          </RNModal>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.groupedBg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  body: { paddingBottom: 8 },
  photoNameRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  photo: { width: 64, height: 64, borderRadius: 32 },
  nameInput: { flex: 1, fontSize: 17 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 9,
  },
  rowPressed: { opacity: 0.7 },
  rowText: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: "600" },
  rowChevron: { fontSize: 18, color: COLORS.muted, fontWeight: "700", marginLeft: 8 },
  dangerText: { color: COLORS.danger },
  errorText: { fontSize: 13, color: COLORS.danger, marginBottom: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  maxReached: { fontSize: 13, color: COLORS.muted, paddingVertical: 10, marginBottom: 4 },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 15,
    backgroundColor: COLORS.blue,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  eventModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 32,
  },
});

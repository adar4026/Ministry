import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { SummaryCard, DS } from "@/components/dashboard";
import { calendarElapsed, formatDateDMY, formatProfileEventElapsed } from "@/data/dateFormat";
import type { UserProfile } from "@/types";

const MAX_EVENTS = 3;
// Reserves a fixed 2-line height for every event's title regardless of
// whether it actually wraps to 1 or 2 lines (TASK_042 revision §7) — so the
// date/duration below it start at the same visual row across all three
// columns, instead of a longer title in one column pushing its own
// date/duration down while its neighbors' stay put.
const EVENT_TITLE_LINE_HEIGHT = 13;

export function ProfileHeroCard({
  profile,
  onPress,
  onInvalidPhoto,
}: {
  profile: UserProfile;
  onPress: () => void;
  // Called once if the saved photo fails to load (TASK_042 revision §13) —
  // e.g. a native file:// copy that no longer exists on disk. The card
  // always falls back to the placeholder regardless; this is only the hook
  // a caller can use to also clear the now-invalid URI from the store.
  onInvalidPhoto?: () => void;
}) {
  const trimmedName = profile.displayName?.trim();
  const hasName = !!trimmedName;
  const hasPhoto = !!profile.profilePhotoUri;
  const isEmpty = !hasName && !hasPhoto && profile.events.length === 0;

  const [photoFailed, setPhotoFailed] = useState(false);
  // A newly-picked/removed photo deserves a fresh chance to load, even if a
  // previous URI had failed.
  useEffect(() => {
    setPhotoFailed(false);
  }, [profile.profilePhotoUri]);

  function handlePhotoError() {
    setPhotoFailed(true);
    onInvalidPhoto?.();
  }

  if (isEmpty) {
    return (
      <SummaryCard onPress={onPress} style={styles.card} accessibilityLabel="Настроить профиль">
        <View style={styles.emptyState}>
          <Avatar size={64} />
          <Text style={styles.emptyTitle}>Настроить профиль</Text>
          <Text style={styles.emptySubtitle}>Добавьте имя, фотографию и важные даты</Text>
          <Text style={styles.emptyAction}>+ Добавить данные</Text>
        </View>
      </SummaryCard>
    );
  }

  const initials = trimmedName?.[0]?.toUpperCase();
  const showPhoto = hasPhoto && !photoFailed;

  return (
    <SummaryCard onPress={onPress} style={styles.card} accessibilityLabel="Открыть профиль для редактирования">
      <View style={styles.header}>
        {showPhoto ? (
          <Image
            source={{ uri: profile.profilePhotoUri }}
            style={styles.photo}
            onError={handlePhotoError}
            accessibilityLabel="Фотография профиля"
          />
        ) : (
          <Avatar size={72} initials={initials} />
        )}
        <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
          {hasName ? trimmedName : "Мой профиль"}
        </Text>
      </View>

      {profile.events.length > 0 && (
        <View style={styles.eventsRow}>
          {[0, 1, 2].map((i) => {
            const ev = profile.events[i];
            if (!ev) return <View key={`empty-${i}`} style={styles.eventCol} />;
            const elapsed = formatProfileEventElapsed(calendarElapsed(ev.date));
            return (
              <View
                key={ev.id}
                style={styles.eventCol}
                accessibilityLabel={`Событие: ${ev.title}, ${formatDateDMY(ev.date)}, ${elapsed}`}
              >
                <View style={styles.eventTitleWrap}>
                  <Text style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
                    {ev.title}
                  </Text>
                </View>
                <Text style={styles.eventDate} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatDateDMY(ev.date)}
                </Text>
                <Text style={styles.eventElapsed} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {elapsed}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {profile.events.length < MAX_EVENTS ? <Text style={styles.addEvent}>+ Добавить событие</Text> : null}
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 4 },
  emptyState: { alignItems: "center", paddingVertical: 8, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: DS.navy, marginTop: 10 },
  emptySubtitle: { fontSize: 14, color: DS.subText, textAlign: "center" },
  emptyAction: { fontSize: 15, fontWeight: "600", color: DS.accent, marginTop: 6 },
  header: { alignItems: "center", gap: 10 },
  photo: { width: 72, height: 72, borderRadius: 36 },
  name: { fontSize: 21, fontWeight: "800", color: DS.navy, textAlign: "center" },
  eventsRow: { flexDirection: "row", gap: 6, marginTop: 18 },
  eventCol: { flex: 1, minWidth: 0 },
  eventTitleWrap: { height: EVENT_TITLE_LINE_HEIGHT * 2, justifyContent: "flex-start" },
  eventTitle: {
    fontSize: 10,
    lineHeight: EVENT_TITLE_LINE_HEIGHT,
    fontWeight: "700",
    color: DS.subText,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  // fontSize kept small enough to fit "21-07-2026"/"10 г 11 мес" in a single
  // line within one of three columns even at a 320px screen width (TASK_042
  // revision §19) — adjustsFontSizeToFit above is a native-only safety net
  // (react-native-web doesn't implement it), so the base size itself must
  // already fit on web.
  eventDate: { fontSize: 11.5, fontWeight: "700", color: DS.navy, marginTop: 2 },
  eventElapsed: { fontSize: 11.5, fontWeight: "700", color: DS.accent, marginTop: 1 },
  addEvent: { fontSize: 14, fontWeight: "600", color: DS.accent, marginTop: 14, textAlign: "center" },
});

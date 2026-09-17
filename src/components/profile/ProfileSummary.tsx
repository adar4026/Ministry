// TASK_066 — the compact profile block at the top of the Home drawer.
//
// Reads the SAME UserProfile the Profile page's ProfileHeroCard and
// ProfileEditSheet work with (useStore().profile, key mj_profile_v1) —
// passed in by the drawer, never copied. The three lines under the name are
// `profile.events`: the owner's own named, dated entries (TASK_042 — e.g.
// «Крещение», «Пионер», «Последний переезд»), each with the canonical
// DD-MM-YYYY date (TASK_022) and the elapsed span ProfileHeroCard also
// shows. No fixed "baptism"/"pioneer" fields exist in the model, so none
// are invented here; an empty profile shows the same "Настроить профиль"
// invitation as the page.
//
// Not a big card: a light, borderless hero zone on the drawer's mint scene.
// Tapping anywhere on it opens the existing editor (the caller decides).
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { MINISTRY } from "@/components/dashboard/tokens";
import { calendarElapsed, formatDateDMY, formatProfileEventElapsed } from "@/data/dateFormat";
import type { UserProfile } from "@/types";

export function ProfileSummary({
  profile,
  onPress,
  onInvalidPhoto,
}: {
  profile: UserProfile;
  onPress: () => void;
  // Same hook ProfileHeroCard/ProfileAvatar expose: the caller clears a
  // stale photo URI from the store when the file no longer loads.
  onInvalidPhoto?: () => void;
}) {
  const trimmedName = profile.displayName?.trim();
  const hasName = !!trimmedName;
  const isEmpty = !hasName && !profile.profilePhotoUri && profile.events.length === 0;
  const initials = trimmedName?.[0]?.toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isEmpty ? "Настроить профиль" : "Открыть профиль для редактирования"}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      testID="profile-summary"
    >
      <View style={styles.head}>
        <ProfileAvatar
          photoUri={profile.profilePhotoUri}
          initials={initials}
          size={52}
          onInvalidPhoto={onInvalidPhoto}
        />
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {isEmpty ? "Настроить профиль" : hasName ? trimmedName : "Мой профиль"}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {isEmpty ? "Добавьте имя, фотографию и важные даты" : "Личный профиль"}
          </Text>
        </View>
      </View>

      {profile.events.length > 0 ? (
        <View style={styles.events}>
          {profile.events.map((ev) => {
            const elapsed = formatProfileEventElapsed(calendarElapsed(ev.date));
            return (
              <View
                key={ev.id}
                style={styles.eventRow}
                accessibilityLabel={`Событие: ${ev.title}, ${formatDateDMY(ev.date)}, ${elapsed}`}
              >
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {ev.title}
                </Text>
                <View style={styles.eventValue}>
                  <Text style={styles.eventDate} numberOfLines={1}>
                    {formatDateDMY(ev.date)}
                  </Text>
                  <Text style={styles.eventElapsed} numberOfLines={1}>
                    {elapsed}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 18, gap: 12 },
  pressed: { backgroundColor: "rgba(255,255,255,0.35)" },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: "700", color: MINISTRY.ink, letterSpacing: -0.2, lineHeight: 23 },
  sub: { fontSize: 13, fontWeight: "500", color: MINISTRY.ink2, marginTop: 2 },
  events: { gap: 6, paddingLeft: 2 },
  // Label left, value column right: long Russian titles wrap inside their
  // own flex slot instead of squeezing three narrow columns.
  eventRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 30 },
  eventTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: MINISTRY.ink2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  eventValue: { alignItems: "flex-end", flexShrink: 0 },
  eventDate: { fontSize: 13, fontWeight: "700", color: MINISTRY.ink },
  eventElapsed: { fontSize: 12, fontWeight: "600", color: MINISTRY.primary, marginTop: 1 },
});

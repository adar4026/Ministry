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
//
// TASK_072 — the dates are the owner's personal MILESTONES, and read like
// one: a single soft glass surface under the name holds one row per event,
// hairline-separated — a small teal marker and the title as the owner typed
// it (no uppercase) on the left; on the right the date as the main fact
// (ink, semibold, tabular digits) with the elapsed span beneath it in the
// brand teal, quieter. A calm iOS grouped list, not a table and not a stack
// of cards; the DrawerGroup settings cards below keep their own denser glass.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { MINISTRY } from "@/components/dashboard/tokens";
import { calendarElapsed, formatDateDMY, formatProfileEventElapsed } from "@/data/dateFormat";
import type { UserProfile } from "@/types";

export function ProfileSummary({
  profile,
  onPress,
  onInvalidPhoto,
  headTrailingSpace = 0,
}: {
  profile: UserProfile;
  onPress: () => void;
  // Same hook ProfileHeroCard/ProfileAvatar expose: the caller clears a
  // stale photo URI from the store when the file no longer loads.
  onInvalidPhoto?: () => void;
  // TASK_072 — space kept free at the right of the NAME row for a control
  // the caller overlays there (the drawer's × button), so the milestones
  // block below can still run the full width of the summary.
  headTrailingSpace?: number;
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
      <View style={[styles.head, headTrailingSpace > 0 && { paddingRight: headTrailingSpace }]}>
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
        <View style={styles.events} testID="profile-summary-events">
          {profile.events.map((ev, i) => {
            const elapsed = formatProfileEventElapsed(calendarElapsed(ev.date));
            const last = i === profile.events.length - 1;
            return (
              <View
                key={ev.id}
                style={[styles.eventRow, !last && styles.eventRowDivider]}
                accessibilityLabel={`Событие: ${ev.title}, ${formatDateDMY(ev.date)}, ${elapsed}`}
              >
                <View style={styles.eventMarker} importantForAccessibility="no" />
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
  wrap: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 18, gap: 14 },
  pressed: { backgroundColor: "rgba(255,255,255,0.35)" },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: "700", color: MINISTRY.ink, letterSpacing: -0.2, lineHeight: 23 },
  sub: { fontSize: 13, fontWeight: "500", color: MINISTRY.ink2, marginTop: 2 },
  // One soft glass surface for the milestones — lighter than the
  // DrawerGroup cards (this is part of the hero zone, not a settings
  // section): translucent white, hairline white edge, no shadow.
  events: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.65)",
    overflow: "hidden",
  },
  // Marker + label left, value column right: long Russian titles wrap inside
  // their own flex slot instead of squeezing three narrow columns.
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
  },
  eventRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(15,42,38,0.10)" },
  // A small brand-teal dot: enough to say "milestone", not an icon set.
  eventMarker: { width: 6, height: 6, borderRadius: 3, backgroundColor: MINISTRY.accent, marginRight: 2 },
  // The title as the owner typed it — no uppercase, a status label rather
  // than a table header.
  eventTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    color: MINISTRY.ink,
    letterSpacing: -0.1,
  },
  eventValue: { alignItems: "flex-end", flexShrink: 0 },
  // Date = the main fact; elapsed span = the quieter second line in teal.
  eventDate: { fontSize: 15, lineHeight: 19, fontWeight: "700", color: MINISTRY.ink, fontVariant: ["tabular-nums"] },
  eventElapsed: { fontSize: 12, lineHeight: 15, fontWeight: "600", color: MINISTRY.primary, marginTop: 1 },
});

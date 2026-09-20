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
// Not a big card: a light, borderless hero zone on the drawer's scene.
// Tapping anywhere on it opens the existing editor (the caller decides).
//
// TASK_072 — the dates are the owner's personal MILESTONES, and read like
// one: one row per event, hairline-separated — a small teal marker and the
// title as the owner typed it (no uppercase) on the left; on the right the
// date as the main fact (ink, bold, tabular digits) with the elapsed span
// beneath it, quieter.
//
// TASK_077 — restyled after the owner's LexMoney drawer reference. The head
// is LexMoney's own top row (avatar left, the name larger and semibold,
// «Личный профиль» in the cool grey-blue secondary, lots of air, no card
// around it), and the milestones are NOT a card any more: no fill, no
// border, no radius — just rows on the drawer's own ice-blue ground, kept
// apart by translucent hairlines and generous vertical padding, so they read
// as a natural part of the top surface. Colours are DRAWER_ICE (cool ink /
// grey-blue), not the hero's teal inks; the small brand-teal marker stays as
// the one Ministry accent. Like Finance's `.drawer-head`, the head row ends
// in a quiet chevron: the whole block is a button into the profile editor,
// and the chevron says so.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ChevronRightIcon } from "@/components/icons";
import { DRAWER_ICE, MINISTRY } from "@/components/dashboard/tokens";
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
        {/* Finance `.drawer-head .avatar`: 50 px inside a 2 px glass ring
            with the card shadow. */}
        <View style={styles.avatarRing}>
          <ProfileAvatar
            photoUri={profile.profilePhotoUri}
            initials={initials}
            size={50}
            onInvalidPhoto={onInvalidPhoto}
          />
        </View>
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {isEmpty ? "Настроить профиль" : hasName ? trimmedName : "Мой профиль"}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {isEmpty ? "Добавьте имя, фотографию и важные даты" : "Личный профиль"}
          </Text>
        </View>
        <View style={styles.headChevron} importantForAccessibility="no" testID="profile-summary-chevron">
          <ChevronRightIcon size={16} color={DRAWER_ICE.chevron} />
        </View>
      </View>

      {profile.events.length > 0 ? (
        <View style={styles.events} testID="profile-summary-events">
          {profile.events.map((ev, i) => {
            const elapsed = formatProfileEventElapsed(calendarElapsed(ev.date));
            return (
              <View
                key={ev.id}
                style={[styles.eventRow, i > 0 && styles.eventRowDivider]}
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
  // Finance `.drawer-top{margin:… 12px 2px}` + `.drawer-balance{margin:4px
  // 16px 8px}`: the head is inset 2 px less than the groups; 8 px of air
  // before the first group.
  wrap: { paddingHorizontal: 0, paddingTop: 2, paddingBottom: 8, borderRadius: 18, gap: 10 },
  pressed: { backgroundColor: DRAWER_ICE.glass },
  // `.drawer-head{gap:12px;padding:6px 8px 6px 6px;border-radius:18px}`
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, paddingLeft: 2, paddingRight: 4, borderRadius: 18 },
  avatarRing: {
    borderRadius: 27,
    borderWidth: 2,
    borderColor: DRAWER_ICE.glassBorder,
    shadowColor: DRAWER_ICE.cardShadow,
    shadowOpacity: DRAWER_ICE.cardShadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headText: { flex: 1, minWidth: 0 },
  // `.dh-name` 17/700, −.2 tracking, line-height 1.2; `.dh-sub` 13/500 muted.
  name: { fontSize: 17, fontWeight: "700", color: DRAWER_ICE.ink, letterSpacing: -0.2, lineHeight: 20 },
  sub: { fontSize: 13, fontWeight: "500", color: DRAWER_ICE.ink2, marginTop: 2 },
  // Finance's `.dh-chev`: a small muted chevron at the end of the head row,
  // before the space the caller keeps for its × button.
  headChevron: { flexShrink: 0, marginLeft: -2 },
  // No surface of its own: the rows sit straight on the drawer ground, in
  // the zone Finance gives its balance block (`margin: 4px 16px 8px`).
  events: { paddingHorizontal: 4 },
  // Marker + label left, value column right: long Russian titles wrap inside
  // their own flex slot instead of squeezing three narrow columns.
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
    minHeight: 52,
  },
  // Finance `.drawer-sep` tone, between rows only.
  eventRowDivider: { borderTopWidth: 1, borderTopColor: DRAWER_ICE.sep },
  // A small brand-teal dot: enough to say "milestone", not an icon set.
  eventMarker: { width: 6, height: 6, borderRadius: 3, backgroundColor: MINISTRY.accent, marginRight: 2 },
  // The title as the owner typed it — no uppercase, a status label rather
  // than a table header.
  eventTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: "500",
    color: DRAWER_ICE.ink,
    letterSpacing: -0.1,
  },
  eventValue: { alignItems: "flex-end", flexShrink: 0 },
  // Date = the main fact (bold); elapsed span = the quieter second line.
  eventDate: { fontSize: 15.5, lineHeight: 20, fontWeight: "700", color: DRAWER_ICE.ink, fontVariant: ["tabular-nums"] },
  eventElapsed: { fontSize: 12.5, lineHeight: 16, fontWeight: "500", color: DRAWER_ICE.ink2, marginTop: 2 },
});

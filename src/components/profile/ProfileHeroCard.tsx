import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { DS, PROFILE_ICE } from "@/components/dashboard";
import { calendarElapsed, formatDateDMY, formatProfileEventElapsed } from "@/data/dateFormat";
import type { UserProfile } from "@/types";

const MAX_EVENTS = 3;

// TASK_076 — full redesign after the owner's LexMoney reference screenshot:
// the old layout (TASK_042) put the three milestones side by side in equal
// columns under an uppercase label, inside a white shadowed SummaryCard. The
// owner asked for the opposite shape — a header (avatar + name, LexMoney's
// own top row) followed by plain label-left/value-right ROWS on one soft
// ice-blue glass surface, hairline-divided, no per-row cards, no shadow, no
// border. `PROFILE_ICE` (tokens.ts) is a deliberate one-off palette for this
// block only — Ministry's teal identity is untouched everywhere else.
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

  if (isEmpty) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Настроить профиль"
        style={({ pressed }) => [styles.surface, pressed && styles.pressed]}
      >
        <View style={styles.emptyState}>
          <Avatar size={64} />
          <Text style={styles.emptyTitle}>Настроить профиль</Text>
          <Text style={styles.emptySubtitle}>Добавьте имя, фотографию и важные даты</Text>
          <Text style={styles.emptyAction}>+ Добавить данные</Text>
        </View>
      </Pressable>
    );
  }

  const initials = trimmedName?.[0]?.toUpperCase();

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Открыть профиль для редактирования"
        style={({ pressed }) => [styles.surface, pressed && styles.pressed]}
      >
        <View style={styles.header}>
          <ProfileAvatar
            photoUri={profile.profilePhotoUri}
            initials={initials}
            size={56}
            onInvalidPhoto={onInvalidPhoto}
          />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
              {hasName ? trimmedName : "Мой профиль"}
            </Text>
            <Text style={styles.sub}>Личный профиль</Text>
          </View>
          <Text style={styles.chev} importantForAccessibility="no">
            ›
          </Text>
        </View>

        {profile.events.length > 0 && (
          <View style={styles.events} testID="profile-hero-events">
            {profile.events.slice(0, MAX_EVENTS).map((ev, i, shown) => {
              const elapsed = formatProfileEventElapsed(calendarElapsed(ev.date));
              const last = i === shown.length - 1;
              return (
                <View
                  key={ev.id}
                  style={[styles.row, !last && styles.rowDivider]}
                  accessibilityLabel={`${ev.title}: ${formatDateDMY(ev.date)}, ${elapsed}`}
                >
                  <Text style={styles.label} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <View style={styles.valueCol}>
                    <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {formatDateDMY(ev.date)}
                    </Text>
                    <Text style={styles.valueSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {elapsed}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Pressable>

      {profile.events.length < MAX_EVENTS ? <Text style={styles.addEvent}>+ Добавить событие</Text> : null}
    </View>
  );
}

// Same soft web-only blur the app's other glass surfaces use (PILL_GLASS in
// heroFigure.tsx, NAV in tokens.ts) — native has no backdrop-filter, so it
// falls back to the plain (mostly opaque) PROFILE_ICE.bg alone.
const ICE_BLUR = Platform.select<object>({
  web: { backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" },
  default: {},
});

const styles = StyleSheet.create({
  // The single surface: no shadow, no border — a flat, light ice-blue glass
  // plane the header and every row sit directly on.
  surface: { backgroundColor: PROFILE_ICE.bg, borderRadius: 24, padding: 18, ...ICE_BLUR },
  pressed: { opacity: 0.92 },
  emptyState: { alignItems: "center", paddingVertical: 8, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: PROFILE_ICE.ink, marginTop: 10 },
  emptySubtitle: { fontSize: 14, color: PROFILE_ICE.ink2, textAlign: "center" },
  emptyAction: { fontSize: 15, fontWeight: "600", color: DS.accent, marginTop: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: "700", color: PROFILE_ICE.ink, letterSpacing: -0.2, lineHeight: 23 },
  sub: { fontSize: 13, fontWeight: "500", color: PROFILE_ICE.ink2, marginTop: 2 },
  chev: { fontSize: 20, color: PROFILE_ICE.ink2, fontWeight: "600" },
  // Generous top gap (not a divider) separates the header from the data
  // rows — the rows themselves are a distinct group, not a 4th row of the
  // same kind as the avatar/name line above.
  events: { marginTop: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PROFILE_ICE.divider },
  // Secondary label, left — a quiet caption, not a heading.
  label: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 19, fontWeight: "500", color: PROFILE_ICE.ink2 },
  // Value column, right — every row's value column aligns on the same
  // vertical (flexShrink: 0 + the row's own justify-between keeps it flush
  // right regardless of the label's width).
  valueCol: { alignItems: "flex-end", flexShrink: 0, marginLeft: 12 },
  value: { fontSize: 15, lineHeight: 19, fontWeight: "600", color: PROFILE_ICE.ink, fontVariant: ["tabular-nums"] },
  valueSub: { fontSize: 12, lineHeight: 15, fontWeight: "500", color: PROFILE_ICE.ink2, marginTop: 1 },
  addEvent: { fontSize: 14, fontWeight: "600", color: DS.accent, marginTop: 14, textAlign: "center" },
});

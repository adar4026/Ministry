import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { MONTHLY_GOAL, dayWord, formatHM, monthProgress } from "@/data/constants";
import { DS } from "./tokens";
import { GoalRing } from "./GoalRing";

// UI state of the hero card. v1 implements only "idle"; the other states are
// declared so the timer can drive this card later WITHOUT a redesign — only
// the action region (see HeroAction) changes per state, never the body. UI
// state is passed in; it is deliberately kept separate from the month
// progress (business data), which is read from the store below.
export type HeroState = "idle" | "running" | "paused" | "completed";

const SEGMENTS = 7;

// Home hero card (TASK_007): current-month hours vs. the monthly goal, with a
// progress ring, a segmented bar and two summary chips. Reads only through
// useStore()/monthProgress()/MONTHLY_GOAL — no new calculation or aggregation.
export function HoursHeroCard({ state = "idle" }: { state?: HeroState }) {
  const { records, sessions } = useStore();
  const p = monthProgress(records, new Date(), sessions);
  const pct = MONTHLY_GOAL > 0 ? (p.hoursDone / MONTHLY_GOAL) * 100 : 0;
  const filled = Math.round((Math.min(100, pct) / 100) * SEGMENTS);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.left}>
          <Text style={styles.total}>{formatHM(p.hoursDone)}</Text>
          <Text style={styles.sub}>за этот месяц</Text>
          <View style={styles.seg}>
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <View key={i} style={[styles.segItem, i < filled ? styles.segOn : styles.segOff]} />
            ))}
          </View>
          <Text style={styles.pctLine}>
            <Text style={styles.pctB}>{Math.round(pct)}%</Text> до месячной цели
          </Text>
        </View>
        <GoalRing pct={pct} goalHours={MONTHLY_GOAL} size={132} />
      </View>

      <View style={styles.divider} />

      <View style={styles.chips}>
        <Chip
          color={DS.green}
          valueColor={DS.greenInk}
          label="До цели осталось"
          value={p.hoursRemaining > 0 ? formatHM(p.hoursRemaining) : "Цель достигнута"}
        />
        <Chip
          color={DS.amber}
          valueColor={DS.amberInk}
          label="Осталось дней"
          value={`${p.daysLeft} ${dayWord(p.daysLeft)}`}
        />
      </View>

      <HeroAction state={state} onStart={() => router.push("/timer")} />
    </View>
  );
}

// Action region — the only part that varies by UI state. v1 implements the
// idle action ("Начать служение"); running/paused/completed will render their
// own controls here later without touching the card body above.
function HeroAction({ state, onStart }: { state: HeroState; onStart: () => void }) {
  switch (state) {
    case "idle":
    default:
      return (
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="Начать служение"
        >
          <Text style={styles.btnText}>Начать служение</Text>
        </Pressable>
      );
  }
}

function Chip({
  color,
  valueColor,
  label,
  value,
}: {
  color: string;
  valueColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View style={styles.chipText}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={[styles.chipValue, { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.heroBg,
    borderRadius: 28,
    padding: 22,
    shadowColor: DS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  left: { flex: 1 },
  total: { fontSize: 40, fontWeight: "800", color: DS.navy, letterSpacing: -1 },
  sub: { fontSize: 15, color: DS.subText, fontWeight: "600", marginTop: 4 },
  seg: { flexDirection: "row", gap: 5, marginTop: 14 },
  segItem: { flex: 1, height: 12, borderRadius: 6 },
  segOn: { backgroundColor: DS.segOn },
  segOff: { backgroundColor: DS.segOff },
  pctLine: { fontSize: 15, color: DS.metaText, fontWeight: "600", marginTop: 10 },
  pctB: { color: DS.accent, fontWeight: "800" },
  divider: { height: 1, backgroundColor: DS.divider, marginVertical: 18 },
  chips: { flexDirection: "row", gap: 12 },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  chipDot: { width: 12, height: 12, borderRadius: 6 },
  chipText: { flex: 1 },
  chipLabel: { fontSize: 13, color: DS.metaText, fontWeight: "600" },
  chipValue: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, marginTop: 1 },
  btn: {
    marginTop: 18,
    borderRadius: 24,
    paddingVertical: 17,
    backgroundColor: "#5b6ee8",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: DS.onAccent, fontSize: 18, fontWeight: "700" },
});

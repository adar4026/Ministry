import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store/StoreContext";
import { dayWord, toISODate } from "@/data/constants";
import {
  formatRelativeDayRu,
  inMonthRu,
  lastParticipationDate,
  participationDaySetForMonth,
} from "@/data/participation";
import { ParticipationSheet } from "@/components/participation/ParticipationSheet";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { MINISTRY } from "./tokens";
import { GlassFigure, PILL_GLASS, useHero } from "./heroFigure";
import { ParticipationMiniCalendar } from "./ParticipationMiniCalendar";
import { useThemedStyles } from "@/theme";

// TASK_073 — the Home hero's content for a PUBLISHER. The question it
// answers is «в какие дни я участвовал в служении?», not «сколько часов»:
//
//   8                       ← the same frosted-glass figure as "37 ч"
//   дней служения в сентябре
//   Последний раз: сегодня
//   [ Пн Вт Ср Чт Пт Сб Вс … ]   ← compact month indicator
//   [ Детали ]  [ ✓ Отметить служение ]
//
// No goal, no percentage, no progress bar, no pace — the figure is neutral
// statistics, never a judgement. Hours are not read here at all. The scene
// behind (HeroScene) is the very same as for pioneers.
export function PublisherHero() {
  const HERO = useHero();
  const styles = useThemedStyles(makeStyles);
  const { participation } = useStore();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayISO = toISODate(now);
  const [sheetOpen, setSheetOpen] = useState(false);

  const markedDays = useMemo(() => participationDaySetForMonth(participation, year, month), [participation, year, month]);
  const days = markedDays.size;
  const last = lastParticipationDate(participation);

  const caption = `${dayWord(days)} служения ${inMonthRu(month)}`;
  const lastText = last ? `Последний раз: ${formatRelativeDayRu(last, todayISO)}` : "Отметок пока нет";
  const a11yLabel = `${days} ${caption}. ${lastText}.`;

  return (
    <View style={styles.wrap} testID="home-hero">
      <View accessible accessibilityLabel={a11yLabel}>
        <GlassFigure pairs={[[String(days), ""]]} />
        <Text style={HERO.caption} importantForAccessibility="no" testID="publisher-hero-caption">
          {caption}
        </Text>
        <Text style={styles.last} importantForAccessibility="no">
          {lastText}
        </Text>
      </View>

      <ParticipationMiniCalendar year={year} month={month} markedDays={markedDays} today={now.getDate()} />

      <View style={HERO.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Детали участия"
          hitSlop={8}
          onPress={() => router.push("/participation" as any)}
          style={({ pressed }) => [HERO.pill, PILL_GLASS, pressed && HERO.pressed]}
        >
          <Text style={HERO.pillText}>Детали</Text>
          <ChevronRightIcon size={14} color={MINISTRY.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Отметить служение"
          hitSlop={8}
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [HERO.pill, HERO.pillPrimary, PILL_GLASS, pressed && HERO.pressed]}
          testID="publisher-mark-button"
        >
          <CheckIcon size={14} color={MINISTRY.primary} />
          <Text style={HERO.pillText}>Отметить служение</Text>
        </Pressable>
      </View>

      <ParticipationSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  wrap: { paddingTop: 0, gap: 0 },
  last: { marginTop: 6, fontSize: 13, lineHeight: 17, fontWeight: "600", color: MINISTRY.ink2 },
});

// TASK_083 — one calendar, two skins. The History components (HistoryCalendar,
// HistorySessionRow, HistoryTotalCard, LegacyMonthRow, PeriodNav,
// PeriodSwitcher) were painted with the screen-local HISTORY_COLORS
// lavender palette (TASK_032). The Home drawer's «Календарь служения»
// (/calendar) renders the SAME components, but as a part of Ministry — DS /
// MINISTRY tokens, /statistics' radius — without History changing by a
// single colour. So, by the ProfileRowVariantContext precedent (TASK_066),
// the variant is a context, not a prop threaded through six components:
//
//   /hours/history           → no provider → "history" (byte-identical look)
//   /calendar                → <CalendarVariantContext.Provider value="ministry">
//
// Every component builds its StyleSheet from a palette (`build(C, FONT)`)
// and picks the sheet through useCalendarStyles(), which keeps one stable
// factory per (build, variant) so useThemedStyles()' per-scheme cache still
// works. Icon colours read the same palette via useCalendarPalette().
import { createContext, useContext } from "react";
import { DS, MINISTRY } from "@/components/dashboard/tokens";
import { useThemedStyles } from "@/theme";
import { HISTORY_COLORS, HISTORY_FONT_FAMILY } from "./historyTokens";

export type CalendarVariant = "history" | "ministry";

export const CalendarVariantContext = createContext<CalendarVariant>("history");

// The roles HISTORY_COLORS already has, plus the two geometry/typography
// knobs that differ between the skins.
export type CalendarPalette = {
  screenBackground: string;
  cardBackground: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  divider: string;
  emptyCellBorder: string;
  filledDayBg: string;
  todayAccent: string;
  onTodayAccent: string;
  iconBg: string;
  segmentTrack: string;
  cardRadius: number;
  font: string | undefined;
};

// History's own palette, as before (live light/dark via HISTORY_COLORS).
export const HISTORY_CALENDAR_PALETTE: CalendarPalette = {
  get screenBackground() { return HISTORY_COLORS.screenBackground; },
  get cardBackground() { return HISTORY_COLORS.cardBackground; },
  get primaryText() { return HISTORY_COLORS.primaryText; },
  get secondaryText() { return HISTORY_COLORS.secondaryText; },
  get mutedText() { return HISTORY_COLORS.mutedText; },
  get divider() { return HISTORY_COLORS.divider; },
  get emptyCellBorder() { return HISTORY_COLORS.emptyCellBorder; },
  get filledDayBg() { return HISTORY_COLORS.filledDayBg; },
  get todayAccent() { return HISTORY_COLORS.todayAccent; },
  onTodayAccent: "#FFFFFF",
  get iconBg() { return HISTORY_COLORS.iconBg; },
  get segmentTrack() { return HISTORY_COLORS.segmentTrack; },
  cardRadius: 18,
  font: HISTORY_FONT_FAMILY,
};

// Ministry skin: the same roles mapped onto the app's live DS / MINISTRY
// tokens (both schemes come for free), /statistics' card radius, the app's
// default font. A logged day is a soft mint wash, today is the accent.
export const MINISTRY_CALENDAR_PALETTE: CalendarPalette = {
  get screenBackground() { return DS.homeBase; },
  get cardBackground() { return DS.cardBg; },
  get primaryText() { return DS.navy; },
  get secondaryText() { return DS.subInk; },
  get mutedText() { return DS.chevron; },
  get divider() { return DS.divider; },
  get emptyCellBorder() { return DS.divider; },
  get filledDayBg() { return MINISTRY.accentSoft; },
  get todayAccent() { return MINISTRY.accent; },
  get onTodayAccent() { return DS.onAccent; },
  get iconBg() { return DS.ringTrack; },
  get segmentTrack() { return DS.ringTrack; },
  cardRadius: 22,
  font: undefined,
};

const PALETTES: Record<CalendarVariant, CalendarPalette> = {
  history: HISTORY_CALENDAR_PALETTE,
  ministry: MINISTRY_CALENDAR_PALETTE,
};

export function useCalendarVariant(): CalendarVariant {
  return useContext(CalendarVariantContext);
}

export function useCalendarPalette(): CalendarPalette {
  return PALETTES[useCalendarVariant()];
}

type Build<T> = (C: CalendarPalette) => T;
// One stable `() => T` factory per (build, variant): useThemedStyles()
// caches sheets by factory identity, so the factories must not be
// recreated on every render.
const factories = new WeakMap<Build<object>, Record<CalendarVariant, () => object>>();

export function useCalendarStyles<T extends object>(build: Build<T>): T {
  const variant = useCalendarVariant();
  let perVariant = factories.get(build as Build<object>);
  if (!perVariant) {
    perVariant = {
      history: () => build(HISTORY_CALENDAR_PALETTE),
      ministry: () => build(MINISTRY_CALENDAR_PALETTE),
    };
    factories.set(build as Build<object>, perVariant);
  }
  return useThemedStyles(perVariant[variant]) as T;
}

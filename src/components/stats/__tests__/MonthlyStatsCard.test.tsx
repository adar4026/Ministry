// Component-level tests for MonthlyStatsCard (TASK_024 layout fix).
//
// react-test-renderer has no real layout engine (no Yoga/CSS), so it cannot
// observe the actual visual bug this task fixed — a value like "3 ч 10 м"
// silently breaking into one character per line. What it *can* verify is
// the resolved style props responsible for the fix, as a regression guard:
// `mainRow` wraps instead of forcing bigValue and chips onto one
// unbreakable line, `bigValue` has a protected minWidth/flexShrink:0 floor,
// and `chips` has its own minWidth/flexBasis instead of relying on
// unconstrained natural content width (the actual root cause — see
// docs/TASKS/TASK_024_MONTHLY_STATS_CARD_OVERFLOW.md). Content-level
// checks (the formatted value renders as one unbroken string) are also
// covered, though those would have passed even before the fix.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, View } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MonthlyStatsCard } from "@/components/stats/MonthlyStatsCard";
import { StoreProvider, useStore } from "@/store/StoreContext";

jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

function collectText(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return;
  }
  if (typeof node === "object" && "children" in (node as Record<string, unknown>)) {
    collectText((node as { children: unknown }).children, out);
  }
}

function mergedStyle(style: unknown): Record<string, unknown> {
  const arr = Array.isArray(style) ? style : [style];
  return Object.assign({}, ...arr);
}

// react-native-web wraps each host View in an extra forwardRef layer that
// shows up as its own TestInstance with the same resolved style, so a fixed
// `.parent.parent` depth is brittle — walk up until the property we care
// about is actually present instead.
function findAncestorWithProp<T extends { parent: T | null; props: { style?: unknown } }>(
  node: T,
  prop: string,
): T {
  let cur: T | null = node.parent;
  while (cur) {
    if (mergedStyle(cur.props.style)[prop] !== undefined) return cur;
    cur = cur.parent;
  }
  throw new Error(`No ancestor with style prop "${prop}" found`);
}

async function renderCard(): Promise<{ store: () => Store; texts: () => string[]; root: () => ReactTestRenderer["root"] }> {
  let latest: Store | null = null;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <MonthlyStatsCard />
      </StoreProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return {
    store: () => latest as unknown as Store,
    texts: () => {
      const out: string[] = [];
      collectText(renderer.toJSON(), out);
      return out;
    },
    root: () => renderer.root,
  };
}

function addSession(store: Store, date: string, durationMinutes: number) {
  store.saveSession({ date, durationMinutes, source: "manual" });
}

function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("MonthlyStatsCard — TASK_024 mainRow/bigValue/chips layout", () => {
  const today = toISODate(new Date());

  it.each([
    ["0 ч", 0],
    ["3 ч 10 м", 190],
    ["12 ч 45 м", 765],
    ["123 ч 59 м", 7439],
  ])("renders %s as one unbroken string, not split across nodes", async (expected, minutes) => {
    const { store, texts } = await renderCard();
    if (minutes > 0) {
      await act(async () => {
        addSession(store(), today, minutes);
      });
    }
    expect(texts()).toContain(expected);
  });

  it("mainRow allows bigValue and chips to wrap onto separate lines instead of forcing one row", async () => {
    const { store, root } = await renderCard();
    await act(async () => {
      addSession(store(), today, 190);
    });
    const hoursDoneText = root().findAll(
      (n) => n.type === Text && mergedStyle(n.props.style).fontSize === 36,
    )[0];
    const mainRow = findAncestorWithProp(hoursDoneText, "flexWrap");
    expect(mergedStyle(mainRow.props.style).flexWrap).toBe("wrap");
  });

  it("bigValue has a protected minWidth and does not shrink below it", async () => {
    const { store, root } = await renderCard();
    await act(async () => {
      addSession(store(), today, 190);
    });
    const hoursDoneText = root().findAll(
      (n) => n.type === Text && mergedStyle(n.props.style).fontSize === 36,
    )[0];
    const bigValueStyle = mergedStyle(findAncestorWithProp(hoursDoneText, "minWidth").props.style);
    // Widest realistic value ("123 ч 59 м") measures ~180px at this font —
    // minWidth must clear that with margin, and flexShrink: 0 makes the
    // floor absolute rather than a soft preference the flex algorithm can
    // still override under pressure from chips' own width.
    expect(bigValueStyle.minWidth as number).toBeGreaterThanOrEqual(180);
    expect(bigValueStyle.flexShrink).toBe(0);
  });

  it("chips has its own minWidth/flexBasis instead of an unconstrained natural width", async () => {
    const { store, root } = await renderCard();
    await act(async () => {
      addSession(store(), today, 190);
    });
    const firstChip = root().findAll(
      (n) => n.type === View && mergedStyle(n.props.style).borderWidth === 1.5,
    )[0];
    const chipsStyle = mergedStyle(findAncestorWithProp(firstChip, "flexBasis").props.style);
    expect(chipsStyle.minWidth).toBeDefined();
    expect(chipsStyle.flexBasis).toBeDefined();
  });

  it("still hides the pace chip when pace is 0 (2-chip case unaffected by the layout fix)", async () => {
    const { texts } = await renderCard();
    const rendered = texts();
    expect(rendered).not.toContain("Темп (7 дн.)");
    expect(rendered).toContain("До цели осталось");
    expect(rendered).toContain("Осталось дней");
  });
});

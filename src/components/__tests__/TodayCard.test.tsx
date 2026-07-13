// Component-level render test for TodayCard — added per the Architecture
// Review Checklist finding: monthProgress() was already correct and
// unit-tested, but TodayCard's call site never passed `sessions` through,
// silently falling back to legacy-only behavior. A unit test on
// monthProgress() alone cannot catch that class of regression, so this
// renders the real component end-to-end through StoreContext.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TodayCard } from "@/components/TodayCard";
import { StoreProvider, useStore } from "@/store/StoreContext";

// The first real host-component render in a test file pays a one-time cold
// start cost (module resolution/transform) that can exceed Jest's default
// 5000ms per-test timeout on a slow filesystem. Every subsequent render in
// this file is fast (see the second test, ~20ms) — this only covers that
// first-render cost.
jest.setTimeout(30000);

type Store = ReturnType<typeof useStore>;

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

// Recursively collects every text leaf from a react-test-renderer JSON tree.
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

async function renderTodayCard(): Promise<{ store: () => Store; texts: () => string[] }> {
  let latest: Store | null = null;
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <StoreProvider>
        <Harness onReady={(s) => { latest = s; }} />
        <TodayCard />
      </StoreProvider>,
    );
    // Flush the async AsyncStorage.getItem() hydration in usePersistentState.
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
  };
}

// Sets the legacy monthly total deterministically, regardless of whether
// seed.js already has a HourRecord for the current real-world month.
function setLegacyHours(store: Store, year: number, month: number, hours: number) {
  const existing = store.records.find((r) => r.year === year && r.month === month);
  store.saveRecord({ id: existing?.id, year, month, hours });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("TodayCard — session-aware rendering", () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayISO = `${year}-${String(month).padStart(2, "0")}-01`;

  it("renders the legacy HourRecord total when no Session exists for the current month", async () => {
    const { store, texts } = await renderTodayCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 42);
    });
    expect(texts()).toContain("42 ч");
  });

  it("renders the Session total — not the legacy fallback — when a Session exists for the current month", async () => {
    const { store, texts } = await renderTodayCard();
    await act(async () => {
      setLegacyHours(store(), year, month, 10);
      store().saveSession({ date: todayISO, durationMinutes: 120, source: "manual" });
    });
    const rendered = texts();
    expect(rendered).toContain("2 ч");
    expect(rendered).not.toContain("10 ч");
  });
});

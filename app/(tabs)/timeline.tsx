import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { ChipSelector, Field, PrimaryButton, TextField, type Option } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { EventForm } from "@/components/forms/EventForm";
import { TalkForm } from "@/components/forms/TalkForm";
import { SwipeableDeleteRow } from "@/components/timeline/SwipeableDeleteRow";
import { EventListCard } from "@/components/timeline/EventListCard";
import { TalkBadge } from "@/components/timeline/TalkBadge";
import { AddActionSheet } from "@/components/timeline/AddActionSheet";
import { TIMELINE_COLORS } from "@/components/timeline/timelineTokens";
import { DS, HomeBackground } from "@/components/dashboard";
import { useTabBarContentInset } from "@/components/TabBar";
import { PlusIcon } from "@/components/icons";
import { CAT, CATEGORY_KEYS, TALK_CATEGORY, categoryMeta, talkTitle } from "@/data/constants";
import { useStore } from "@/store/StoreContext";
import type { MinistryEvent, Talk } from "@/types";

// "talk" is a synthetic filter/category for public talks in the combined
// timeline; it is not part of the MinistryEvent category enum.
const TALK_FILTER = "talk";

// TASK_041 — these label overrides are local to this page's top filter row.
// The shared CAT dictionary (src/data/constants.ts) keeps its original
// singular labels, since it also drives Badge (shown on this same page and
// on the Home dashboard) and EventForm's category picker (shown on this page
// AND on /add) — renaming CAT itself would silently reskin those other
// surfaces too. A plural filter label next to a singular per-item badge is
// already an existing pattern here: "Публичные речи" (filter) vs
// "Публичная речь" (TALK_CATEGORY.label, the per-item badge).
const FILTER_LABEL_OVERRIDES: Partial<Record<string, string>> = {
  appointment: "Назначения",
  school: "Школы",
};

// System-only filter chips — the fixed part of the row. User-created topics
// (TASK_045) are appended at render time (see filterOptions below) since
// they come from live store state, not a module-level constant.
const SYSTEM_FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: TALK_FILTER, label: "Публичные" },
  ...CATEGORY_KEYS.map((k) => ({
    value: k as string,
    label: FILTER_LABEL_OVERRIDES[k] ?? CAT[k].label,
  })),
];

// TASK_058 (revised) — the owner-specified topic order used when the full
// grid is expanded: the six system entries first (by stable value key),
// then the one custom topic matched by name (a user-created CustomCategory
// only gets a random uid, never a fixed key — if the owner hasn't created a
// topic with this exact name yet, it simply sorts wherever it would
// otherwise land, alongside every other custom topic), then everything else
// in filterOptions' own order (stable sort).
const PRIMARY_SYSTEM_VALUES = ["all", TALK_FILTER, "pioneer", "appointment", "move", "school", "personal"];
const PRIMARY_CUSTOM_TOPIC_NAME = "Конгрессы";

function primaryRank(opt: Option<string>): number {
  const i = PRIMARY_SYSTEM_VALUES.indexOf(opt.value);
  if (i !== -1) return i;
  if (opt.label === PRIMARY_CUSTOM_TOPIC_NAME) return PRIMARY_SYSTEM_VALUES.length;
  return PRIMARY_SYSTEM_VALUES.length + 1;
}

type TimelineItem =
  | { kind: "event"; id: string; date: string; ev: MinistryEvent }
  | { kind: "talk"; id: string; date: string; talk: Talk };

export default function TimelineScreen() {
  const { events, talks, customCategories, saveEvent, deleteEvent, saveTalk, deleteTalk, addCustomCategory } =
    useStore();
  // TASK_054 — clearance now lives on this ScrollView's own content instead
  // of the shared Tabs scene padding (see app/(tabs)/_layout.tsx).
  const bottomInset = useTabBarContentInset();
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editEv, setEditEv] = useState<MinistryEvent | null>(null);
  const [editTalk, setEditTalk] = useState<Talk | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [topicError, setTopicError] = useState<string | null>(null);
  const [topicsExpanded, setTopicsExpanded] = useState(false);

  // TASK_045 — a chip per user-created topic, appended after the system
  // ones; appears immediately once addCustomCategory() saves it (same
  // reactive StoreContext, no remount needed).
  const filterOptions = useMemo(
    () => [...SYSTEM_FILTER_OPTIONS, ...customCategories.map((c) => ({ value: c.id, label: c.name }))],
    [customCategories],
  );

  // TASK_058 (revised) — no chips are shown until "Все темы (N)" is
  // expanded; once open, this is the full topic grid in the
  // owner-specified order (stable sort — see primaryRank above).
  const allTopics = useMemo(
    () => [...filterOptions].sort((a, b) => primaryRank(a) - primaryRank(b)),
    [filterOptions],
  );

  // Combine events + talks at the UI layer only; both collections stay separate.
  const items = useMemo<TimelineItem[]>(() => {
    const q = query.trim().toLowerCase();
    const eventItems: TimelineItem[] =
      filter === TALK_FILTER
        ? []
        : events
            .filter((e) => filter === "all" || e.category === filter)
            .map((e) => ({ kind: "event", id: e.id, date: e.date, ev: e }));
    const talkItems: TimelineItem[] =
      filter === "all" || filter === TALK_FILTER
        ? talks.map((t) => ({ kind: "talk", id: t.id, date: t.date, talk: t }))
        : [];

    return [...eventItems, ...talkItems]
      .filter((it) => {
        if (!q) return true;
        const title = it.kind === "event" ? it.ev.title : talkTitle(it.talk);
        return title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [events, talks, filter, query]);

  function confirmDeleteEvent(id: string) {
    Alert.alert("Удалить событие?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteEvent(id); setEditEv(null); } },
    ]);
  }

  function confirmDeleteTalk(id: string) {
    Alert.alert("Удалить речь?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteTalk(id); setEditTalk(null); } },
    ]);
  }

  function closeTopicModal() {
    setAddingTopic(false);
    setTopicName("");
    setTopicError(null);
  }

  function submitTopic() {
    const result = addCustomCategory(topicName);
    if (!result.ok) {
      setTopicError(result.error === "empty" ? "Введите название темы." : "Такая тема уже существует.");
      return;
    }
    closeTopicModal();
  }

  return (
    <View style={styles.screen}>
      <HomeBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <View style={styles.headerRow}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>События</Text>
            <Text style={styles.pageSubtitle}>Важные даты и мероприятия</Text>
          </View>
          {/* TASK_058 — replaces the two large "Добавить событие"/"Добавить
              тему" tiles with a single compact entry point; both actions
              still live behind AddActionSheet below, unchanged. */}
          <Pressable
            onPress={() => setAddMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Добавить"
            hitSlop={4}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <PlusIcon size={22} color={DS.onAccent} />
          </Pressable>
        </View>

        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск..."
          style={styles.search}
        />
        <View style={styles.topicsSection}>
          {/* TASK_058 (revised) — collapsed by default: only this toggle is
              visible under the search field, no chips. Expanding it reveals
              every topic (system + custom) in one wrapping grid; collapsing
              again hides the whole grid, leaving just the toggle. */}
          <Pressable
            onPress={() => setTopicsExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={topicsExpanded ? "Свернуть темы" : "Показать все темы"}
            hitSlop={6}
            style={({ pressed }) => [styles.moreTopicsBtn, pressed && styles.pressed]}
          >
            <Text style={styles.moreTopicsText}>{`Все темы (${customCategories.length})`}</Text>
            <Text style={[styles.moreTopicsChevron, topicsExpanded && styles.moreTopicsChevronOpen]}>▾</Text>
          </Pressable>
          {topicsExpanded ? (
            <ChipSelector
              options={allTopics}
              value={filter}
              onChange={setFilter}
              idleTextColor={TIMELINE_COLORS.topicText}
            />
          ) : null}
        </View>

        <View style={styles.list}>
          {items.length === 0 ? <Text style={styles.empty}>Нет событий</Text> : null}
          {items.map((it) =>
            it.kind === "event" ? (
              <SwipeableDeleteRow
                key={`e-${it.id}`}
                onDelete={() => deleteEvent(it.id)}
                deleteAccessibilityLabel={`Удалить событие: ${it.ev.title}`}
              >
                <EventListCard
                  dotColor={categoryMeta(it.ev.category, customCategories).dot}
                  title={it.ev.title}
                  date={it.date}
                  badge={<Badge category={it.ev.category} customCategories={customCategories} />}
                  onEdit={() => setEditEv(it.ev)}
                  editAccessibilityLabel={`Редактировать событие: ${it.ev.title}`}
                />
              </SwipeableDeleteRow>
            ) : (
              <SwipeableDeleteRow
                key={`t-${it.id}`}
                onDelete={() => deleteTalk(it.id)}
                deleteAccessibilityLabel={`Удалить речь: ${talkTitle(it.talk)}`}
              >
                <EventListCard
                  dotColor={TALK_CATEGORY.dot}
                  title={talkTitle(it.talk)}
                  date={it.date}
                  metaSuffix={`${it.talk.location ? `  —  ${it.talk.location}` : ""}${
                    it.talk.number ? `  ·  №${it.talk.number}` : ""
                  }`}
                  badge={<TalkBadge />}
                  onEdit={() => setEditTalk(it.talk)}
                  editAccessibilityLabel={`Редактировать речь: ${talkTitle(it.talk)}`}
                />
              </SwipeableDeleteRow>
            ),
          )}
        </View>

        <Modal visible={editEv !== null} title="Редактировать событие" onClose={() => setEditEv(null)}>
          {editEv && (
            <EventForm
              initial={editEv}
              customCategories={customCategories}
              onSave={(input) => { saveEvent(input); setEditEv(null); }}
              onDelete={() => confirmDeleteEvent(editEv.id)}
            />
          )}
        </Modal>

        <Modal visible={editTalk !== null} title="Редактировать речь" onClose={() => setEditTalk(null)}>
          {editTalk && (
            <TalkForm
              initial={editTalk}
              onSave={(input) => { saveTalk(input); setEditTalk(null); }}
              onDelete={() => confirmDeleteTalk(editTalk.id)}
            />
          )}
        </Modal>

        <AddActionSheet
          visible={addMenuOpen}
          onClose={() => setAddMenuOpen(false)}
          onAddEvent={() => router.push(`/add?focus=event`)}
          onAddTopic={() => setAddingTopic(true)}
        />

        <Modal visible={addingTopic} title="Новая тема" onClose={closeTopicModal}>
          <Field label="Название">
            <TextField
              value={topicName}
              onChangeText={(v) => { setTopicName(v); setTopicError(null); }}
              placeholder="Например, Конгрессы"
            />
          </Field>
          {topicError ? <Text style={styles.topicError}>{topicError}</Text> : null}
          <View style={styles.topicActions}>
            <Pressable onPress={closeTopicModal} style={styles.topicCancelBtn}>
              <Text style={styles.topicCancelText}>Отмена</Text>
            </Pressable>
            <View style={styles.topicSaveWrap}>
              <PrimaryButton label="Сохранить" onPress={submitTopic} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // TASK_041 (revised) — same background mechanism as Home
  // (app/(tabs)/index.tsx): DS.homeBase as the flat base color, with
  // <HomeBackground /> layering its gradient on top. No page-local
  // background color — this page no longer has one of its own.
  screen: { flex: 1, backgroundColor: DS.homeBase },
  scroll: { flex: 1 },
  content: { padding: 16 },
  // TASK_045/TASK_058 — same header treatment as Profile (TASK_044): large
  // navy title, light-blue subtitle, same horizontal inset, inside the
  // scrollable content above the search field. `headerRow` places the
  // compact "+" button to the right of that same title/subtitle block
  // (TASK_058) instead of the two large tiles that used to follow it.
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  pageHeader: { flex: 1, paddingHorizontal: 4 },
  pageTitle: { fontSize: 28, fontWeight: "700", color: DS.navy, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 14, color: DS.subText, marginTop: 2 },
  // TASK_058 — compact brand-blue "+" entry point for AddActionSheet.
  // 44x44 minimum touch target; rounded-square (not a circle) to read
  // distinctly from the TabBar's own circular floating "Добавить" FAB.
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: DS.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DS.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pressed: { opacity: 0.85 },
  search: { marginBottom: 10 },
  // TASK_058 (revised again) — collapsed by default: just the "Все темы
  // (N)" toggle under the search field. Expanding it drops the full topic
  // grid in below, in the same `gap: 6` rhythm ChipSelector uses between
  // its own chip rows (`chipRow.gap`, src/components/ui.tsx), so it reads
  // as one continuous grid rather than a separately-spaced block.
  topicsSection: { gap: 6, marginBottom: 12 },
  moreTopicsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  moreTopicsText: { fontSize: 13, fontWeight: "600", color: DS.subText },
  moreTopicsChevron: { fontSize: 13, color: DS.subText, fontWeight: "600" },
  moreTopicsChevronOpen: { transform: [{ rotate: "180deg" }] },
  list: { gap: 12 },
  empty: { textAlign: "center", color: DS.subText, fontSize: 14, marginTop: 24 },
  topicError: { color: TIMELINE_COLORS.danger, fontSize: 13, marginTop: -6, marginBottom: 10 },
  topicActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  topicCancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DS.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCancelText: { color: TIMELINE_COLORS.primaryText, fontWeight: "600", fontSize: 15 },
  topicSaveWrap: { flex: 1 },
});

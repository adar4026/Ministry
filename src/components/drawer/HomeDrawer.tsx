// TASK_066 — the Home screen's left-hand navigation drawer: the new home of
// everything the "Профиль" tab shows (that tab stays until the owner
// decides — see docs/TASKS/TASK_066_… §6).
//
// Behaviour is modelled on A-Lex Finance's drawer and Lexcar's SideDrawer:
// slides in from the left over a dimmed backdrop, leaves a strip of Home
// visible on the right, scrolls on its own while Home cannot, closes on
// backdrop tap, the × button, a leftward swipe and Escape (web).
//
// Same base primitive as AddActionSheet / ProfileEditSheet (TASK_058/042):
// a transparent RNModal — which already stacks above the floating TabBar
// and blocks the page behind it — plus react-native's own Animated and
// PanResponder for the motion. Nothing new in package.json. Presentation
// is `animationType="none"`: one `progress` value (0 closed … 1 open) drives
// both the panel's translateX and the backdrop opacity, and a swipe simply
// moves that same value, so the gesture and the animation never disagree.
//
// Data: `profile` / `saveProfile` straight from useStore() — the same
// object ProfileHeroCard and ProfileEditSheet use. No drawer-local copy.
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal as RNModal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { BackupSection } from "@/components/settings/BackupSection";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ProfileRowVariantContext, ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import {
  ABOUT_ITEMS,
  DRAWER_APP_KEYS,
  DRAWER_SERVICE_KEYS,
  activateMenuItem,
  pickMenuItems,
} from "@/components/profile/profileMenu";
import { HeroScene } from "@/components/dashboard/HeroScene";
import { MINISTRY } from "@/components/dashboard/tokens";
import { CloudIcon, InfoIcon, PersonIcon, XIcon } from "@/components/icons";
import { APP_VERSION } from "@/data/appInfo";
import { prefersReducedMotion } from "@/utils/motion";
import { useStore } from "@/store/StoreContext";
import { DrawerFooter } from "./DrawerFooter";
import { DrawerGroup } from "./DrawerGroup";

// Panel geometry: most of the screen, but never all of it — the strip of
// Home left visible on the right is what makes it read as a drawer.
export const DRAWER_WIDTH_FRACTION = 0.86;
export const DRAWER_MAX_WIDTH = 360;
export function drawerPanelWidth(windowWidth: number): number {
  return Math.min(Math.round(windowWidth * DRAWER_WIDTH_FRACTION), DRAWER_MAX_WIDTH);
}

// Swipe-to-close thresholds (Lexcar: 60 px; velocity as in AddActionSheet).
const SWIPE_CLOSE_DX = 60;
const SWIPE_CLOSE_VX = 0.5;
const OPEN_MS = 320;
const CLOSE_MS = 220;
// Width the × button (44) plus its gap takes out of the summary's name row.
const CLOSE_BTN_SPACE = 50;

// The three gesture decisions, kept pure (and exported) so the swipe logic
// is unit-testable without synthesising responder touch histories.
/** A leftward, clearly horizontal move claims the responder; anything else
 *  is left to the panel's own vertical ScrollView. */
export function shouldCaptureDrawerSwipe(dx: number, dy: number): boolean {
  return dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.5;
}
/** Open-progress (0…1) for a drag of `dx` px on a panel `width` px wide;
 *  dragging right past the open position is ignored. */
export function drawerProgressForDrag(dx: number, width: number): number {
  return Math.min(1, Math.max(0, 1 + Math.min(0, dx) / width));
}
/** Release closes when the drag went far enough or fast enough leftward. */
export function shouldCloseDrawerOnRelease(dx: number, vx: number): boolean {
  return dx < -SWIPE_CLOSE_DX || vx < -SWIPE_CLOSE_VX;
}

// react-native-web has no native animated module: asking for it there only
// prints a warning and falls back to JS anyway.
const NATIVE_DRIVER = Platform.OS !== "web";

function haptic(fn: () => Promise<void>) {
  fn().catch(() => {});
}

export function HomeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, saveProfile } = useStore();
  // Degrade-to-zero insets outside the app shell (component tests), the
  // same rule useTabBarContentInset() follows.
  const insets = useContext(SafeAreaInsetsContext);
  const topInset = insets?.top ?? 0;
  const bottomInset = insets?.bottom ?? 0;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const panelWidth = drawerPanelWidth(windowWidth);

  // The modal stays mounted through the close animation: `rendered` lags
  // `open` by one animation.
  const [rendered, setRendered] = useState(open);
  const [editOpen, setEditOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(windowHeight);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    if (open) {
      setRendered(true);
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      if (prefersReducedMotion()) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
      return;
    }
    if (!rendered) return;
    if (prefersReducedMotion()) {
      progress.setValue(0);
      setRendered(false);
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      useNativeDriver: NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) setRendered(false);
    });
    // `rendered` is deliberately not a dependency: a change of `open` is the
    // only thing that should start an animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, progress]);

  // Escape closes on web (Lexcar/Finance parity). The editor sheet is a
  // modal of its own above us; while it is open, Escape belongs to it.
  useEffect(() => {
    if (!rendered || Platform.OS !== "web" || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editOpen) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rendered, editOpen, onClose]);

  // Leftward swipe on the panel drags `progress` down; release past the
  // threshold (distance or velocity) closes, otherwise springs back. Only
  // clearly horizontal moves are captured, so the panel's own vertical
  // scroll is untouched.
  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => shouldCaptureDrawerSwipe(g.dx, g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          progress.setValue(drawerProgressForDrag(g.dx, panelWidthRef.current));
        },
        onPanResponderRelease: (_e, g) => {
          if (shouldCloseDrawerOnRelease(g.dx, g.vx)) {
            onCloseRef.current();
          } else {
            Animated.spring(progress, { toValue: 1, useNativeDriver: NATIVE_DRIVER, bounciness: 4 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(progress, { toValue: 1, useNativeDriver: NATIVE_DRIVER, bounciness: 4 }).start();
        },
      }),
    [progress],
  );

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });

  const clearInvalidPhoto = useCallback(
    () => saveProfile({ displayName: profile.displayName, events: profile.events, profilePhotoUri: undefined }),
    [profile.displayName, profile.events, saveProfile],
  );

  const nameSubtitle = profile.displayName?.trim() || "Имя и фотография";

  return (
    <RNModal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root} testID="home-drawer">
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessible={false}
            importantForAccessibility="no"
            testID="drawer-backdrop"
          />
        </Animated.View>

        <Animated.View
          {...pan.panHandlers}
          role="dialog"
          aria-modal
          accessibilityViewIsModal
          accessibilityLabel="Меню"
          onLayout={(e) => setPanelHeight(Math.round(e.nativeEvent.layout.height))}
          style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}
          testID="drawer-panel"
        >
          {/* Ministry's own scene as the panel ground — static: no second
              WebGL context while the Home hero's is still alive below. */}
          <HeroScene height={panelHeight} animated={false} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingTop: topInset + 12 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            testID="drawer-scroll"
          >
            {/* TASK_072 — the × is overlaid on the name row (the summary
                keeps that corner free via headTrailingSpace) so the
                milestones block under the name runs the full width. */}
            <View style={styles.topRow}>
              <ProfileSummary
                profile={profile}
                onPress={() => setEditOpen(true)}
                onInvalidPhoto={clearInvalidPhoto}
                headTrailingSpace={CLOSE_BTN_SPACE}
              />
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть меню"
                hitSlop={4}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                testID="drawer-close"
              >
                <XIcon size={20} color={MINISTRY.ink} />
              </Pressable>
            </View>

            <ProfileRowVariantContext.Provider value="drawer">
              {/* TASK_072 — one row: the dates are edited from the same
                  sheet (and shown as milestones in ProfileSummary above), so
                  the former «Памятные даты» row is gone. A single `last` row
                  in a DrawerGroup is one whole rounded cell, no divider. */}
              <DrawerGroup title="Профиль">
                <ProfileSettingsRow
                  icon={PersonIcon}
                  title="Личные данные"
                  subtitle={nameSubtitle}
                  accessibilityLabel="Личные данные"
                  onPress={() => setEditOpen(true)}
                  last
                />
              </DrawerGroup>

              <DrawerGroup title="Служение">
                {pickMenuItems(DRAWER_SERVICE_KEYS).map((item, i, all) => (
                  <ProfileSettingsRow
                    key={item.key}
                    icon={item.icon}
                    title={item.label}
                    onPress={() => activateMenuItem(item)}
                    last={i === all.length - 1}
                  />
                ))}
              </DrawerGroup>

              <DrawerGroup title="Приложение">
                {pickMenuItems(DRAWER_APP_KEYS).map((item, i, all) => (
                  <ProfileSettingsRow
                    key={item.key}
                    icon={item.icon}
                    title={item.label}
                    onPress={() => activateMenuItem(item)}
                    last={i === all.length - 1}
                  />
                ))}
              </DrawerGroup>

              <DrawerGroup title="Данные и резервные копии">
                <BackupSection last={false} />
                <ProfileSettingsRow icon={CloudIcon} title="Синхронизация" subtitle="Скоро — через A-Lex Core" last />
              </DrawerGroup>

              <DrawerGroup title="О приложении">
                <ProfileSettingsRow icon={InfoIcon} title="Версия приложения" value={APP_VERSION} />
                {ABOUT_ITEMS.map((item, i, all) => (
                  <ProfileSettingsRow
                    key={item.key}
                    icon={item.icon}
                    title={item.label}
                    onPress={() => activateMenuItem(item)}
                    last={i === all.length - 1}
                  />
                ))}
              </DrawerGroup>
            </ProfileRowVariantContext.Provider>

            <DrawerFooter bottomInset={bottomInset} />
          </ScrollView>
        </Animated.View>

        {/* The same editor the Profile page opens — one component, one
            saveProfile(); the summary above re-renders from the store. */}
        <ProfileEditSheet visible={editOpen} profile={profile} onSave={saveProfile} onClose={() => setEditOpen(false)} />
      </View>
    </RNModal>
  );
}

const BACKDROP_BLUR = Platform.select<object>({
  web: { backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Pine-teal dim, not neutral black: the strip of Home that stays visible
  // keeps reading as part of the same green scene.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,36,30,0.34)", ...BACKDROP_BLUR },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: MINISTRY.bg,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    shadowColor: MINISTRY.heroDeep,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 6, height: 0 },
    elevation: 12,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, gap: 16 },
  topRow: { position: "relative", paddingHorizontal: 2 },
  // 44×44 touch target, light glass circle, no border — pinned to the top
  // right corner of the summary's name row.
  closeBtn: {
    position: "absolute",
    top: 6,
    right: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  closeBtnPressed: { backgroundColor: "rgba(255,255,255,0.85)" },
});

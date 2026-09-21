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
  SETTINGS_SCREEN_ITEM,
  activateMenuItem,
  pickMenuItems,
  type ProfileMenuItem,
} from "@/components/profile/profileMenu";
import { DRAWER_ICE } from "@/components/dashboard/tokens";
import { CloudIcon, InfoIcon, MoonIcon, PersonIcon, SunIcon, XIcon } from "@/components/icons";
import { APP_VERSION } from "@/data/appInfo";
import { MODE_LABEL, THEME_LABEL } from "@/data/ministryMode";
import { prefersReducedMotion } from "@/utils/motion";
import { useStore } from "@/store/StoreContext";
import { useTheme } from "@/theme";
import { DrawerFooter } from "./DrawerFooter";
import { DrawerGroup } from "./DrawerGroup";
import { DrawerScene } from "./DrawerScene";
import { useThemedStyles } from "@/theme";

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
// Width the two round buttons (theme 36 + gap 6 + × 40) plus a 2 px gap
// take out of the summary's name row (TASK_078 added the theme button,
// Finance's `.dh-theme`; the × keeps a 44+ pt hit area via hitSlop).
const THEME_BTN = 36;
const CLOSE_BTN = 40;
const CLOSE_BTN_SPACE = CLOSE_BTN + 6 + THEME_BTN + 2;

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
  const styles = useThemedStyles(makeStyles);
  const { profile, saveProfile, settings } = useStore();
  const modeSubtitle = `Режим: ${MODE_LABEL[settings.ministryMode]}`;
  // TASK_078 — Finance's round ☼/☾ button: cycles light → dark → system;
  // the icon follows the RESOLVED scheme, the label names the preference.
  const theme = useTheme();
  // A row that navigates closes the drawer first (TASK_073), so the pushed
  // screen is not left under this modal; placeholder rows keep the drawer.
  const openMenuItem = useCallback(
    (item: ProfileMenuItem) => {
      if (item.href) onClose();
      activateMenuItem(item);
    },
    [onClose],
  );
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
          {/* TASK_077 — the drawer's own light, copied from Lex Finance's
              drawer (SVG + two drifting blobs; no second WebGL context while
              the Home hero's is still alive below). Replaces the Home hero's
              green HeroScene. */}
          <DrawerScene width={panelWidth} height={panelHeight} />

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
                onPress={theme.cycle}
                accessibilityRole="button"
                accessibilityLabel={`Сменить тему. Сейчас: ${THEME_LABEL[theme.preference]}`}
                hitSlop={6}
                style={({ pressed }) => [styles.themeBtn, pressed && styles.closeBtnPressed]}
                testID="drawer-theme"
              >
                {theme.scheme === "dark" ? (
                  <MoonIcon size={19} color={DRAWER_ICE.ink} />
                ) : (
                  <SunIcon size={19} color={DRAWER_ICE.ink} />
                )}
              </Pressable>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть меню"
                hitSlop={6}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                testID="drawer-close"
              >
                <XIcon size={20} color={DRAWER_ICE.ink} />
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
                    onPress={() => openMenuItem(item)}
                    last={i === all.length - 1}
                  />
                ))}
              </DrawerGroup>

              <DrawerGroup title="Приложение">
                {/* TASK_073 — «Настройки» opens the app's own settings screen
                    (ministry mode, hours goal); closes the drawer first so the
                    pushed screen is not covered by the modal. */}
                <ProfileSettingsRow
                  icon={SETTINGS_SCREEN_ITEM.icon}
                  title={SETTINGS_SCREEN_ITEM.label}
                  subtitle={modeSubtitle}
                  onPress={() => openMenuItem(SETTINGS_SCREEN_ITEM)}
                />
                {pickMenuItems(DRAWER_APP_KEYS).map((item, i, all) => (
                  <ProfileSettingsRow
                    key={item.key}
                    icon={item.icon}
                    title={item.label}
                    onPress={() => openMenuItem(item)}
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
                    onPress={() => openMenuItem(item)}
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

// Finance `.overlay.drawer-ov`: blur(16px) saturate(140%).
const BACKDROP_BLUR = Platform.select<object>({
  web: { backdropFilter: "blur(16px) saturate(140%)", WebkitBackdropFilter: "blur(16px) saturate(140%)" },
  default: {},
});

const makeStyles = () => StyleSheet.create({
  root: { flex: 1 },
  // TASK_077 — Finance's drawer overlay: a cool graphite dim plus blur.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: DRAWER_ICE.backdrop, ...BACKDROP_BLUR },
  // TASK_077 — the ground past the scene is the scene's own bottom stop,
  // so a long drawer never shows a seam; shadow = Finance `--nav-shadow`.
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: DRAWER_ICE.bottom,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    shadowColor: DRAWER_ICE.panelShadow,
    shadowOpacity: DRAWER_ICE.panelShadowOpacity,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  scroll: { flex: 1 },
  // Finance rhythm: `.drawer-group{margin:12px 16px 0}`.
  content: { paddingHorizontal: 16, gap: 12 },
  topRow: { position: "relative", paddingTop: 6 },
  // 40 pt round glass button (44+ pt hit area via hitSlop), Finance `.dh-theme` look:
  // glass fill + glass rim) — pinned to the top right corner of the
  // summary's name row.
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 0,
    width: CLOSE_BTN,
    height: CLOSE_BTN,
    borderRadius: CLOSE_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DRAWER_ICE.glass,
    borderWidth: 1,
    borderColor: DRAWER_ICE.glassBorder,
  },
  closeBtnPressed: { backgroundColor: DRAWER_ICE.glassPressed },
  // Finance `.dh-theme`: 38 px round glass button with the glass rim, to
  // the left of ×; its icon sits at .82 like the reference.
  themeBtn: {
    position: "absolute",
    top: 14,
    right: CLOSE_BTN + 6,
    width: THEME_BTN,
    height: THEME_BTN,
    borderRadius: THEME_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DRAWER_ICE.glass,
    borderWidth: 1,
    borderColor: DRAWER_ICE.glassBorder,
    opacity: 0.92,
  },
});

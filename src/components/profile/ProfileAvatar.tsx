// TASK_043 — shared photo/placeholder circle, extracted from ProfileHeroCard
// (TASK_042) so the Home header avatar can show the same
// profile.profilePhotoUri with the same broken-file fallback, instead of a
// second copy of this logic. Purely presentational: caller owns the actual
// UserProfile and decides what onInvalidPhoto does (clears the stored URI).
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet } from "react-native";
import { Avatar } from "@/components/Avatar";

export function ProfileAvatar({
  photoUri,
  size,
  initials,
  onInvalidPhoto,
  onPress,
  accessibilityLabel,
  hitSlop,
}: {
  photoUri?: string;
  size: number;
  initials?: string;
  // Called once if the photo fails to load (e.g. a native file:// copy that
  // no longer exists on disk) — the circle always falls back to the
  // placeholder regardless; this is only the hook a caller can use to also
  // clear the now-invalid URI from the store.
  onInvalidPhoto?: () => void;
  // Only provided by callers that need this circle itself to be the tap
  // target (e.g. the Home header). Omit when an ancestor is already
  // Pressable (e.g. ProfileHeroCard) to avoid a nested Pressable.
  onPress?: () => void;
  accessibilityLabel?: string;
  hitSlop?: number;
}) {
  const [failed, setFailed] = useState(false);
  // A newly-picked/removed photo deserves a fresh chance to load, even if a
  // previous URI had failed.
  useEffect(() => {
    setFailed(false);
  }, [photoUri]);

  const showPhoto = !!photoUri && !failed;

  const circle = showPhoto ? (
    <Image
      source={{ uri: photoUri }}
      style={[styles.photo, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="cover"
      accessibilityLabel="Фотография профиля"
      onError={() => {
        setFailed(true);
        onInvalidPhoto?.();
      }}
    />
  ) : (
    <Avatar size={size} initials={initials} />
  );

  if (!onPress) return circle;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {circle}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photo: {},
  pressed: { opacity: 0.8 },
});

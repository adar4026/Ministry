// Native (iOS/Android) profile photo picker (TASK_042). Uses expo-image-picker
// — the project's first image-picking dependency, added specifically for this
// task after confirming no existing library/mechanism covered it (see
// docs/TASKS/TASK_042_PROFILE_HERO_CARD.md). Metro resolves this file on
// native; src/utils/profilePhoto.web.ts is the web/PWA implementation.
import * as ImagePicker from "expo-image-picker";

export type PickProfilePhotoCallbacks = {
  /** The user picked and (optionally) cropped a photo. */
  onSelected: (uri: string) => void;
  /** Permission denied, or a picker/library failure. */
  onError: (err: Error) => void;
  /** The user backed out of the picker without choosing a photo. */
  onCancelled: () => void;
};

export async function pickProfilePhoto(callbacks: PickProfilePhotoCallbacks): Promise<void> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      callbacks.onError(new Error("permission-denied"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) {
      callbacks.onCancelled();
      return;
    }
    const uri = result.assets[0]?.uri;
    if (!uri) {
      callbacks.onError(new Error("no-photo-selected"));
      return;
    }
    callbacks.onSelected(uri);
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error("pick-failed"));
  }
}

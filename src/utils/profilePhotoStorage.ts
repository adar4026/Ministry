// Native (iOS/Android) permanent storage for the profile photo (TASK_042
// revision). expo-image-picker only ever returns a URI into a *temporary*
// cache location — the OS can evict it any time, so it must never be the
// value persisted in UserProfile.profilePhotoUri. This module copies the
// picked photo into a Ministry-owned directory under the app's document
// directory (survives app restarts, not cleared by the OS the way a cache
// dir can be) and is the only place allowed to delete a *Ministry-owned*
// copy — it never touches the user's original gallery photo or any URI
// outside its own directory. Metro resolves this file on native;
// src/utils/profilePhotoStorage.web.ts is the web/PWA no-op counterpart
// (data URIs there are already self-contained strings, nothing to copy).
import { Directory, File, Paths } from "expo-file-system";

const PROFILE_PHOTOS_DIR_NAME = "profile-photos";

function profileDir(): Directory {
  return new Directory(Paths.document, PROFILE_PHOTOS_DIR_NAME);
}

function isMinistryOwned(uri: string): boolean {
  return uri.startsWith(profileDir().uri);
}

function copyToPermanentStorage(tempUri: string): string {
  const dir = profileDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const source = new File(tempUri);
  const ext = source.extension || ".jpg";
  const filename = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dest = new File(dir, filename);
  source.copy(dest);
  return dest.uri;
}

// Best-effort cleanup of an old Ministry-owned copy. Never throws — a failed
// delete of a stale copy must not block saving the new photo or removing
// one. Silently ignores any URI outside this module's own directory,
// including the user's original gallery photo.
function deleteIfOwned(uri: string | undefined): void {
  if (!uri || !isMinistryOwned(uri)) return;
  try {
    new File(uri).delete();
  } catch {
    // best-effort — an already-missing or locked file is not an error here
  }
}

// Applies a photo change decided in the Profile edit sheet: copies `newUri`
// (a fresh temp pick, or unchanged/undefined) into permanent storage and
// deletes the previous Ministry-owned copy only after the new copy exists —
// so a copy failure (thrown here) leaves the old, still-working photo
// completely untouched. Returns the URI that should be persisted in
// UserProfile.profilePhotoUri.
export async function commitProfilePhoto(
  newUri: string | undefined,
  oldUri: string | undefined,
): Promise<string | undefined> {
  if (newUri === oldUri) return oldUri;
  if (!newUri) {
    deleteIfOwned(oldUri);
    return undefined;
  }
  const finalUri = copyToPermanentStorage(newUri);
  deleteIfOwned(oldUri);
  return finalUri;
}

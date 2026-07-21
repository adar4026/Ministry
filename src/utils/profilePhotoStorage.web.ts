// Web/PWA counterpart to src/utils/profilePhotoStorage.ts. On web the
// picked photo is already a self-contained `data:` URI (see
// src/utils/profilePhoto.web.ts) stored directly inside the profile JSON —
// there is no temp file to copy and no permanent copy to delete, so this is
// a pure pass-through. Metro resolves this file on web.
export async function commitProfilePhoto(
  newUri: string | undefined,
  _oldUri: string | undefined,
): Promise<string | undefined> {
  return newUri;
}

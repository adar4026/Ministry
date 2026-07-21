// TASK_042 revision — native permanent photo storage. Uses the manual mock
// at __mocks__/expo-file-system.ts (see that file's comment for why this
// can't be an inline jest.mock() factory) to verify: a picked photo is
// copied into the Ministry-owned profile-photos directory, an old
// Ministry-owned copy is deleted only after the new copy succeeds, a
// non-Ministry URI (e.g. the user's original gallery file) is never
// deleted, and a copy failure leaves the old photo completely untouched.
// jest-expo's own setupFiles already register a jest.mock('expo-file-system', ...)
// with the old legacy async API (see node_modules/jest-expo/src/preset/setup.js)
// — this re-registration (a literal require(), no out-of-scope variable, so
// babel-plugin-jest-hoist can hoist it safely) replaces that with the
// SDK 54 sync File/Directory/Paths shape this project's code actually uses.
// The mock lives in src/utils/testHelpers/ (not __tests__/, which Jest's
// default testMatch would otherwise pick up as its own — empty — test file;
// not a root __mocks__/expo-file-system.* file either, since Jest treats any
// require resolving to that exact path as "the mock for expo-file-system"
// regardless of specifier, which makes a require() inside this very
// jest.mock() factory recurse into itself).
jest.mock("expo-file-system", () => require("@/utils/testHelpers/expoFileSystemMock"));

import { commitProfilePhoto } from "@/utils/profilePhotoStorage";
import {
  __created,
  __deletedUris,
  __resetMock,
  __setNextCopyShouldThrow,
} from "@/utils/testHelpers/expoFileSystemMock";

beforeEach(() => {
  __resetMock();
});

describe("commitProfilePhoto — no change", () => {
  it("returns the same uri and touches nothing when newUri === oldUri", async () => {
    const result = await commitProfilePhoto("mock-doc/profile-photos/a.jpg", "mock-doc/profile-photos/a.jpg");
    expect(result).toBe("mock-doc/profile-photos/a.jpg");
    expect(__deletedUris).toEqual([]);
  });
});

describe("commitProfilePhoto — adding a photo (no previous photo)", () => {
  it("copies the picked photo into the profile-photos directory", async () => {
    const result = await commitProfilePhoto("file:///cache/picked.jpg", undefined);
    expect(result).toMatch(/^mock-doc\/profile-photos\/profile-.*\.jpg$/);
    expect(__deletedUris).toEqual([]);
  });

  it("creates the profile-photos directory on demand", async () => {
    await commitProfilePhoto("file:///cache/picked.jpg", undefined);
    expect(__created.some((c) => c.kind === "dir" && c.uri === "mock-doc/profile-photos")).toBe(true);
  });
});

describe("commitProfilePhoto — replacing an existing photo", () => {
  it("creates a new copy and deletes the old Ministry-owned copy", async () => {
    const oldUri = "mock-doc/profile-photos/profile-old.jpg";
    const result = await commitProfilePhoto("file:///cache/new-pick.jpg", oldUri);
    expect(result).toMatch(/^mock-doc\/profile-photos\//);
    expect(result).not.toBe(oldUri);
    expect(__deletedUris).toEqual([oldUri]);
  });

  it("never deletes a URI outside the Ministry profile-photos directory (e.g. the user's original gallery file)", async () => {
    const externalUri = "file:///DCIM/Camera/original.jpg";
    await commitProfilePhoto("file:///cache/new-pick.jpg", externalUri);
    expect(__deletedUris).toEqual([]);
  });

  it("does not accumulate old copies across several consecutive replacements", async () => {
    let current: string | undefined;
    current = await commitProfilePhoto("file:///cache/pick1.jpg", current);
    current = await commitProfilePhoto("file:///cache/pick2.jpg", current);
    current = await commitProfilePhoto("file:///cache/pick3.jpg", current);
    expect(__deletedUris).toHaveLength(2); // the two intermediate copies, not the final one
    expect(__deletedUris).not.toContain(current);
  });

  it("a copy failure leaves the old working photo untouched and does not delete it", async () => {
    const oldUri = "mock-doc/profile-photos/profile-old.jpg";
    __setNextCopyShouldThrow(true);
    await expect(commitProfilePhoto("file:///cache/broken-pick.jpg", oldUri)).rejects.toThrow("copy-failed");
    expect(__deletedUris).toEqual([]);
  });
});

describe("commitProfilePhoto — removing a photo", () => {
  it("deletes the Ministry-owned copy and returns undefined", async () => {
    const oldUri = "mock-doc/profile-photos/profile-old.jpg";
    const result = await commitProfilePhoto(undefined, oldUri);
    expect(result).toBeUndefined();
    expect(__deletedUris).toEqual([oldUri]);
  });

  it("does not attempt to delete a non-Ministry URI when removing", async () => {
    const externalUri = "file:///DCIM/Camera/original.jpg";
    const result = await commitProfilePhoto(undefined, externalUri);
    expect(result).toBeUndefined();
    expect(__deletedUris).toEqual([]);
  });

  it("is a no-op when there was no previous photo", async () => {
    const result = await commitProfilePhoto(undefined, undefined);
    expect(result).toBeUndefined();
    expect(__deletedUris).toEqual([]);
  });
});

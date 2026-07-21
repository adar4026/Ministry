// Test-only stand-in for expo-file-system's SDK 54 sync File/Directory/Paths
// API (TASK_042 revision), used by profilePhotoStorage.test.ts. Deliberately
// NOT placed in a root __mocks__/expo-file-system.* file: Jest treats any
// require that resolves to that exact path as "the mock for expo-file-system"
// regardless of specifier, which causes a require() inside jest.mock()'s
// factory to recurse into itself. A plainly-named file here has no such
// special meaning, so the test file can both register it as the mock (via
// jest.mock("expo-file-system", () => require("./expoFileSystemMock"))) and
// import its exported trackers directly without collision.
export const __created: Array<{ uri: string; kind: "file" | "dir" }> = [];
export const __deletedUris: string[] = [];
let __nextCopyShouldThrow = false;

export function __setNextCopyShouldThrow(value: boolean): void {
  __nextCopyShouldThrow = value;
}

export function __resetMock(): void {
  __created.length = 0;
  __deletedUris.length = 0;
  __nextCopyShouldThrow = false;
}

export class File {
  uri: string;
  extension = ".jpg";
  private _exists = true;

  constructor(...parts: Array<string | File | Directory>) {
    this.uri = parts
      .map((p) => (typeof p === "string" ? p : p.uri))
      .join("/")
      .replace(/\/{2,}/g, "/");
    __created.push({ uri: this.uri, kind: "file" });
  }

  get exists() {
    return this._exists;
  }

  copy(destination: File) {
    if (__nextCopyShouldThrow) throw new Error("copy-failed");
    destination._exists = true;
  }

  delete() {
    __deletedUris.push(this.uri);
  }
}

export class Directory {
  uri: string;
  private _exists = false;

  constructor(...parts: Array<string | File | Directory>) {
    this.uri = parts
      .map((p) => (typeof p === "string" ? p : p.uri))
      .join("/")
      .replace(/\/{2,}/g, "/");
    __created.push({ uri: this.uri, kind: "dir" });
  }

  get exists() {
    return this._exists;
  }

  create() {
    this._exists = true;
  }
}

export const Paths = {
  get document(): Directory {
    return new Directory("mock-doc");
  },
};

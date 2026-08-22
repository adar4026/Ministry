import { canonicalJSON, checksumOf, sha256Hex } from "@/data/sha256";

describe("sha256Hex — FIPS 180-4 / RFC test vectors", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
  ])("hashes %p correctly", (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it("hashes a 1,000,000-character message (multi-block, length > 2^16 bits)", () => {
    expect(sha256Hex("a".repeat(1_000_000))).toBe(
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
    );
  });

  // Expected digests below come from Node's own crypto implementation
  // (`createHash("sha256").update(s, "utf8")`) — an independent reference
  // for the multi-byte UTF-8 paths the RFC vectors never exercise.
  it("hashes 2-byte code points (Cyrillic) via UTF-8 bytes", () => {
    expect(sha256Hex("Служение")).toBe("1d386af635dc7b9c6bc219bf131ef0de89917f74b0706ee6a83c9ddeaf4c801f");
  });

  it("hashes 4-byte code points (surrogate pairs)", () => {
    expect(sha256Hex("🙂")).toBe("d06f1525f791397809f9bc98682b5c13318eca4c3123433467fd4dffda44fd14");
  });

  it("hashes a 56-byte message (the padding boundary case)", () => {
    expect(sha256Hex("x".repeat(56))).toBe("04c26261370ee7541549d16dee320c723e3fd14671e66a099afe0a377c16888e");
  });

  it("always returns 64 lowercase hex characters", () => {
    for (const s of ["", "a", "x".repeat(55), "x".repeat(56), "x".repeat(64), "x".repeat(119)]) {
      expect(sha256Hex(s)).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("canonicalJSON", () => {
  it("orders object keys so re-serialization cannot change the digest", () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(checksumOf({ b: 1, a: 2 })).toBe(checksumOf({ a: 2, b: 1 }));
  });

  it("preserves array order (arrays are data, not sets)", () => {
    expect(canonicalJSON([2, 1])).toBe("[2,1]");
    expect(checksumOf([1, 2])).not.toBe(checksumOf([2, 1]));
  });

  it("drops undefined object members and nulls them inside arrays, like JSON.stringify", () => {
    expect(canonicalJSON({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(canonicalJSON([undefined])).toBe("[null]");
  });

  it("serializes null, booleans, strings and nested structures", () => {
    expect(canonicalJSON({ z: null, y: true, x: "s", w: { b: [1, { d: 2, c: 3 }] } })).toBe(
      '{"w":{"b":[1,{"c":3,"d":2}]},"x":"s","y":true,"z":null}',
    );
  });

  it("nulls non-finite numbers, like JSON.stringify", () => {
    expect(canonicalJSON({ a: NaN, b: Infinity })).toBe('{"a":null,"b":null}');
  });

  it("gives the same digest before and after a JSON round-trip with different key order", () => {
    const value = { data: { records: [{ id: "r1", hours: 5, year: 2026 }] }, version: 2 };
    const reordered = JSON.parse(JSON.stringify(value, ["version", "data", "records", "id", "year", "hours"]));
    expect(checksumOf(reordered)).toBe(checksumOf(value));
  });
});

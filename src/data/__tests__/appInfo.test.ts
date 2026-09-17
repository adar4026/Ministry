// TASK_066 — one app version, everywhere.
import { readFileSync } from "fs";
import { join } from "path";
import { APP_DISPLAY_NAME, APP_UPDATED, APP_VERSION, formatUpdatedLabel } from "@/data/appInfo";
import { APP_VERSION as BACKUP_APP_VERSION } from "@/data/backup";

describe("appInfo", () => {
  it("APP_VERSION matches package.json", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf8"));
    expect(APP_VERSION).toBe(pkg.version);
  });

  it("backup.ts re-exports the very same constant (no second literal)", () => {
    expect(BACKUP_APP_VERSION).toBe(APP_VERSION);
  });

  it("the display name is hyphenated 'A-Lex Ministry'", () => {
    expect(APP_DISPLAY_NAME).toBe("A-Lex Ministry");
  });

  it("APP_UPDATED is a YYYY-MM stamp and formats as a lower-case Russian month + year", () => {
    expect(APP_UPDATED).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(formatUpdatedLabel("2026-09")).toBe("сентябрь 2026");
    expect(formatUpdatedLabel("2027-01")).toBe("январь 2027");
    expect(formatUpdatedLabel()).toBe(formatUpdatedLabel(APP_UPDATED));
  });

  it("returns malformed input unchanged rather than throwing", () => {
    expect(formatUpdatedLabel("2026-13")).toBe("2026-13");
    expect(formatUpdatedLabel("nope")).toBe("nope");
  });
});

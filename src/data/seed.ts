import type { HourRecord, MinistryEvent, Talk } from "@/types";

// Canonical seed data lives in seed.js (plain JavaScript, kept untouched per
// project rules — see CLAUDE.md). This module is the single typed entry point;
// nothing else should import seed.js directly.
// The explicit ".js" extension prevents this .ts file from importing itself.
import {
  SEED_RECORDS as RAW_RECORDS,
  SEED_EVENTS as RAW_EVENTS,
  SEED_TALKS as RAW_TALKS,
} from "./seed.js";

export const SEED_RECORDS = RAW_RECORDS as HourRecord[];
export const SEED_EVENTS = RAW_EVENTS as MinistryEvent[];
export const SEED_TALKS = RAW_TALKS as Talk[];

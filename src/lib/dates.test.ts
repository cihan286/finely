import { describe, expect, test } from "vitest";
import {
  addDays,
  daysBetween,
  isValidTimeZone,
  localDay,
  startOfDay,
  todayIn,
  zonedTime,
} from "./dates";

test("isValidTimeZone", () => {
  expect(isValidTimeZone("Europe/Istanbul")).toBe(true);
  expect(isValidTimeZone("UTC")).toBe(true);
  expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
});

describe("localDay", () => {
  // 03:30 UTC on Oct 6 is still Oct 5 in New York, already Oct 6 in Tokyo
  const moment = new Date("2026-10-06T03:30:00Z");
  test.each([
    ["UTC", "2026-10-06"],
    ["America/New_York", "2026-10-05"],
    ["Asia/Tokyo", "2026-10-06"],
    ["Pacific/Kiritimati", "2026-10-06"],
  ])("%s -> %s", (timeZone, expected) => {
    expect(localDay(moment, timeZone)).toBe(expected);
  });

  test("late evening at the end of a year", () => {
    expect(localDay(new Date("2027-01-01T02:00:00Z"), "America/Los_Angeles")).toBe("2026-12-31");
  });
});

test("todayIn", () => {
  const now = new Date("2026-10-06T22:30:00Z");
  expect(todayIn("UTC", now)).toBe("2026-10-06");
  expect(todayIn("Europe/Istanbul", now)).toBe("2026-10-07"); // UTC+3
});

test("addDays and daysBetween", () => {
  expect(addDays("2026-10-06", 1)).toBe("2026-10-07");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-10-06", -29)).toBe("2026-09-07");
  expect(daysBetween("2026-10-01", "2026-10-06")).toBe(5);
  expect(daysBetween("2026-10-06", "2026-10-01")).toBe(-5);
});

describe("zonedTime", () => {
  test.each([
    ["UTC", "2026-10-06T12:00:00.000Z"],
    ["America/New_York", "2026-10-06T16:00:00.000Z"], // EDT, UTC-4
    ["Europe/Istanbul", "2026-10-06T09:00:00.000Z"], // UTC+3
    ["Asia/Kolkata", "2026-10-06T06:30:00.000Z"], // UTC+5:30
    ["Pacific/Kiritimati", "2026-10-05T22:00:00.000Z"], // UTC+14
  ])("noon on 2026-10-06 in %s", (timeZone, expected) => {
    expect(zonedTime("2026-10-06", "12:00", timeZone).toISOString()).toBe(expected);
  });

  test("noon always lands on the same local day", () => {
    for (const timeZone of ["Pacific/Kiritimati", "Pacific/Pago_Pago", "America/New_York"]) {
      expect(localDay(zonedTime("2026-10-06", "12:00", timeZone), timeZone)).toBe("2026-10-06");
    }
  });

  test("across daylight-saving changes", () => {
    // New York: winter is UTC-5, summer UTC-4 (switch on 2026-03-08)
    expect(startOfDay("2026-03-08", "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(startOfDay("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    // Back on 2026-11-01
    expect(startOfDay("2026-11-02", "America/New_York").toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});

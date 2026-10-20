import { describe, expect, it } from "vitest";
import { slotTimes } from "./schedule";

describe("slotTimes", () => {
  it("covers a normal day in 15-minute slots", () => {
    const slots = slotTimes("09:00:00", "10:00:00");
    expect(slots).toEqual(["09:00:00", "09:15:00", "09:30:00", "09:45:00"]);
  });

  it("runs past midnight for stores that close the next day", () => {
    const slots = slotTimes("23:00:00", "01:00:00", 30);
    expect(slots).toEqual(["23:00:00", "23:30:00", "00:00:00", "00:30:00"]);
  });

  it("treats equal opening and closing times as open 24 hours", () => {
    expect(slotTimes("06:00:00", "06:00:00")).toHaveLength(96);
  });

  it("doesn't start a slot at or after closing", () => {
    expect(slotTimes("09:00:00", "09:40:00")).toEqual(["09:00:00", "09:15:00", "09:30:00"]);
  });

  it("supports other slot lengths", () => {
    expect(slotTimes("12:00:00", "13:00:00", 30)).toEqual(["12:00:00", "12:30:00"]);
  });
});

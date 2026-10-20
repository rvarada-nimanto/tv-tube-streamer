import { addMinutes, format, parse } from "date-fns";

/**
 * Slot start times ("HH:mm:ss") from opening until closing, every `slotMinutes`.
 * A closing time at or before the opening time means the store closes the next day.
 */
export function slotTimes(openingTime: string, closingTime: string, slotMinutes = 15): string[] {
  const openTime = parse(openingTime, "HH:mm:ss", new Date());
  let closeTime = parse(closingTime, "HH:mm:ss", new Date());
  // Stores open past midnight close on the next day
  if (closeTime <= openTime) {
    closeTime = addMinutes(closeTime, 24 * 60);
  }

  const times: string[] = [];
  for (let t = openTime; t < closeTime; t = addMinutes(t, slotMinutes)) {
    times.push(format(t, "HH:mm:ss"));
  }
  return times;
}

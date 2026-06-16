import { HebrewCalendar, HDate, Event, flags } from '@hebcal/core';
import { isSameDay } from 'date-fns';

/**
 * Checks if a given Date is a Jewish holiday (Yom Tov) or Shabbat.
 * @param date The JS Date to check
 * @returns true if it's Shabbat or a Yom Tov where work is traditionally prohibited
 */
export function isShabbatOrHoliday(date: Date): boolean {
  const hdate = new HDate(date);
  
  // Check if it's Saturday
  if (date.getDay() === 6) {
    return true;
  }

  // Get holidays for the given Hebrew year
  // il: true means Israel holiday schedule
  const events = HebrewCalendar.getHolidaysOnDate(hdate, true) || [];
  
  for (const ev of events) {
    const evFlags = ev.getFlags();
    if (evFlags & flags.CHAG) {
      return true;
    }
  }

  return false;
}

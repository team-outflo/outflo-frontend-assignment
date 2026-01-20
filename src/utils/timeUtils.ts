import { DateTime } from 'luxon';
import { luxonToDisplayMap } from './timezoneUtils';

/**
 * Convert a time string (e.g., "09:30") to seconds since midnight.
 */
export function timeStringToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}

/**
 * Convert seconds since midnight to a time string (e.g., "09:30").
 */
export function secondsToTimeString(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Format seconds since midnight into a localized time string (e.g., "9:30 AM").
 */
export function formatSecondsToLocalTime(seconds: number, timeZone: string): string {
  const dt = DateTime.fromSeconds(seconds, { zone: timeZone }).startOf('day').plus({ seconds });
  return dt.toFormat('hh:mm a');
}

/**
 * Check if current time in given timezone is within specified start and end time (in seconds).
 */
export function isNowWithinTimeSpan(startTime: number, endTime: number, timeZone: string): boolean {
  const now = DateTime.now().setZone(timeZone);
  const currentSeconds = now.hour * 3600 + now.minute * 60 + now.second;
  return currentSeconds >= startTime && currentSeconds <= endTime;
}


export function convertToSecondsFormat(operationalTimes: Record<string, any>) {
  const formatted: Record<string, { startTime: number, endTime: number, enabled: boolean }> = {};

  const toSeconds = (time: string): number => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 3600 + minute * 60;
  };

  for (const day in operationalTimes) {
    const lowerDay = day.toLowerCase();
    const { enabled, slots } = operationalTimes[day];

    let startTime = 0;
    let endTime = 0;

    if (enabled && slots.length > 0) {
      startTime = toSeconds(slots[0].from);
      endTime = toSeconds(slots[slots.length - 1].to);
    }

    formatted[lowerDay] = {
      startTime,
      endTime,
      enabled
    };
  }

  return formatted;
}



export const formatWithAbbrev = (
  utcString: string,
  preferredTimezone?: string
): string => {
  if (!utcString) return "";

  const targetTZ =
    preferredTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dt = DateTime.fromISO(utcString, { zone: "utc" }).setZone(targetTZ);
  // Get abbreviation via Luxon (may be "+0530")
  let abbrev = dt.toFormat("ZZZ");

  // Replace fallback offset with stable abbreviation if known

  if (dt.zoneName === "Asia/Calcutta") {
    abbrev = "IST";
  }

  if (luxonToDisplayMap[dt.zoneName]) {
    abbrev = luxonToDisplayMap[dt.zoneName];
  }

  return `${dt.toFormat("MMM d, yyyy, hh:mm a")} ${abbrev}`;
};

/**
 * Format date in short format for expiration display (e.g., "14 Nov, 5pm GMT")
 */
export const formatExpirationDate = (
  utcString: string,
  preferredTimezone?: string
): string => {
  if (!utcString) return "";

  const targetTZ =
    preferredTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dt = DateTime.fromISO(utcString, { zone: "utc" }).setZone(targetTZ);
  // Get abbreviation via Luxon (may be "+0530")
  let abbrev = dt.toFormat("ZZZ");

  // Replace fallback offset with stable abbreviation if known
  if (dt.zoneName === "Asia/Calcutta") {
    abbrev = "IST";
  }

  if (luxonToDisplayMap[dt.zoneName]) {
    abbrev = luxonToDisplayMap[dt.zoneName];
  }

  // Format: "14 Nov, 5pm GMT" (day month, time timezone)
  return `${dt.toFormat("d MMM")}, ${dt.toFormat("ha").toLowerCase()} ${abbrev}`;
};

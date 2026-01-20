/**
 * Timezone mapping from display format (e.g., 'IST', 'GMT') to Luxon IANA format (e.g., 'Asia/Kolkata', 'Etc/GMT')
 */
export const timezoneDisplayToLuxonMap: Record<string, string> = {
  // UTC/GMT
  GMT: 'Etc/GMT',
  UTC: 'Etc/UTC',
  'Greenwich Mean Time': 'Etc/GMT',
  'Coordinated Universal Time': 'Etc/UTC',

  // India
  IST: 'Asia/Kolkata',
  'Indian Standard Time': 'Asia/Kolkata',

  // US Time Zones
  EST: 'America/New_York',
  'Eastern Standard Time': 'America/New_York',
  EDT: 'America/New_York',
  'Eastern Daylight Time': 'America/New_York',

  CST: 'America/Chicago',
  'Central Standard Time': 'America/Chicago',
  CDT: 'America/Chicago',
  'Central Daylight Time': 'America/Chicago',

  MST: 'America/Denver',
  'Mountain Standard Time': 'America/Denver',
  MDT: 'America/Denver',
  'Mountain Daylight Time': 'America/Denver',

  PST: 'America/Los_Angeles',
  'Pacific Standard Time': 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  'Pacific Daylight Time': 'America/Los_Angeles',

  // Europe
  CET: 'Europe/Paris',
  'Central European Time': 'Europe/Paris',
  CEST: 'Europe/Paris',
  'Central European Summer Time': 'Europe/Paris',

  BST: 'Europe/London',
  'British Summer Time': 'Europe/London',

  EET: 'Europe/Bucharest',
  'Eastern European Time': 'Europe/Bucharest',
  EEST: 'Europe/Bucharest',
  'Eastern European Summer Time': 'Europe/Bucharest',

  // Australia
  AEST: 'Australia/Sydney',
  'Australian Eastern Standard Time': 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
  'Australian Eastern Daylight Time': 'Australia/Sydney',

  ACST: 'Australia/Adelaide',
  'Australian Central Standard Time': 'Australia/Adelaide',

  AWST: 'Australia/Perth',
  'Australian Western Standard Time': 'Australia/Perth',

  // China
  CST_CHINA: 'Asia/Shanghai',
  'China Standard Time': 'Asia/Shanghai',

  // Japan
  JST: 'Asia/Tokyo',
  'Japan Standard Time': 'Asia/Tokyo',

  // Russia
  MSK: 'Europe/Moscow',
  'Moscow Standard Time': 'Europe/Moscow',

  // Middle East
  AST: 'Asia/Riyadh',
  'Arabian Standard Time': 'Asia/Riyadh',

  // Africa
  'South Africa Standard Time': 'Africa/Johannesburg',
  SAST: 'Africa/Johannesburg'
};

/**
 * Reverse mapping from Luxon IANA format to display format
 */
export const luxonToDisplayMap: Record<string, string> = {};

// Build reverse map from display to luxon map
Object.entries(timezoneDisplayToLuxonMap).forEach(([display, luxon]) => {
  // Only keep the first/primary display format for each luxon format
  if (!luxonToDisplayMap[luxon]) {
    luxonToDisplayMap[luxon] = display;
  }
});

/**
 * Convert display format timezone (e.g., 'IST', 'GMT') to Luxon IANA format (e.g., 'Asia/Kolkata', 'Etc/GMT')
 * @param displayFormat - Display format timezone string (e.g., 'IST', 'GMT')
 * @returns Luxon IANA format timezone string (e.g., 'Asia/Kolkata', 'Etc/GMT')
 */
export function displayToLuxonFormat(displayFormat: string | null | undefined): string {
  if (!displayFormat) return 'Etc/UTC';
  
  // Check if it's already in Luxon format
  if (displayFormat.includes('/') || displayFormat.startsWith('Etc/')) {
    return displayFormat;
  }
  
  // Convert from display format to Luxon format
  return timezoneDisplayToLuxonMap[displayFormat] || displayFormat;
}

/**
 * Convert Luxon IANA format timezone (e.g., 'Asia/Kolkata', 'Etc/GMT') to display format (e.g., 'IST', 'GMT')
 * @param luxonFormat - Luxon IANA format timezone string (e.g., 'Asia/Kolkata', 'Etc/GMT')
 * @returns Display format timezone string (e.g., 'IST', 'GMT')
 */
export function luxonToDisplayFormat(luxonFormat: string | null | undefined): string {
  if (!luxonFormat) return 'UTC';
  
  // Check if it's already in display format (not a Luxon format)
  if (!luxonFormat.includes('/') && !luxonFormat.startsWith('Etc/')) {
    return luxonFormat;
  }
  
  // Convert from Luxon format to display format
  return luxonToDisplayMap[luxonFormat] || luxonFormat;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use displayToLuxonFormat instead
 */
export const zoneMap = timezoneDisplayToLuxonMap;


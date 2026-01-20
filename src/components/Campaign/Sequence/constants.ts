// Character limits for different account types
export const CHARACTER_LIMITS = {
  PREMIUM: 300,
  STANDARD: 200,
} as const;

// Default delay values
export const DEFAULT_DELAY = {
  DAYS: 1,
  HOURS: 0,
  MINUTES: 0,
} as const;

// Default follow-up delay values
export const DEFAULT_FOLLOWUP_DELAY = {
  DAYS: 2,
  HOURS: 0,
  MINUTES: 0,
} as const;

// Time conversion constants
export const TIME_CONVERSION = {
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 60 * 60,
  SECONDS_PER_DAY: 24 * 60 * 60,
} as const;

// UI styling classes
export const STYLE_CLASSES = {
  CONNECTION_STEP: {
    CONTAINER: 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border',
    CONTAINER_VIEW_MODE: 'bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border-indigo-100',
    ICON_CONTAINER: 'w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg',
  },
  DELAY_STEP: {
    CONTAINER: 'bg-slate-50 border border-slate-200 rounded-lg px-4 py-3',
    CONTAINER_VIEW_MODE: 'border-slate-100',
    ICON_CONTAINER: 'w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center',
  },
  FOLLOWUP_STEP: {
    CONTAINER: 'bg-white border border-indigo-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200',
    CONTAINER_VIEW_MODE: 'border-gray-100',
    ICON_CONTAINER: 'w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg',
  },
} as const;

// Message types
export const MESSAGE_TYPES = {
  PREMIUM: 'premium',
  STANDARD: 'standard',
} as const;

// Step types
export const STEP_TYPES = {
  CONNECTION: 'connection',
  DELAY: 'delay',
  FOLLOWUP: 'followup',
} as const;

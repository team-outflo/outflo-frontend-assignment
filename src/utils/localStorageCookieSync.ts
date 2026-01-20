/**
 * Utility to sync localStorage data with cookies for extension access
 * This ensures that data stored in localStorage is also available in cookies
 * so that the extension can access it
 */

interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Set a cookie with the given name, value, and options
 */
function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return; // SSR safety

  const {
    expires,
    maxAge,
    path = '/',
    domain,
    secure = window.location.protocol === 'https:',
    sameSite = 'Lax'
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }

  if (maxAge !== undefined) {
    cookieString += `; max-age=${maxAge}`;
  }

  cookieString += `; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += '; secure';
  }

  cookieString += `; samesite=${sameSite}`;

  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // SSR safety

  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    let c = cookie.trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

/**
 * Remove a cookie by name
 */
function removeCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return; // SSR safety

  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

/**
 * Sync localStorage item to cookie
 * This function should be called whenever localStorage is updated
 */
export function syncLocalStorageToCookie(key: string, value: string | null): void {
  try {
    if (value === null) {
      // Remove from both localStorage and cookie
      localStorage.removeItem(key);
      removeCookie(`ls_${key}`);
    } else {
      // Set in both localStorage and cookie
      localStorage.setItem(key, value);
      
      // Store in cookie with 'ls_' prefix to avoid conflicts
      // Use a reasonable expiration (30 days)
      setCookie(`ls_${key}`, value, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        secure: window.location.protocol === 'https:',
        sameSite: 'Lax'
      });
    }
  } catch (error) {
    console.warn(`Failed to sync localStorage key "${key}" to cookie:`, error);
  }
}

/**
 * Enhanced localStorage methods that automatically sync to cookies
 */
export const localStorageWithCookieSync = {
  setItem: (key: string, value: string): void => {
    syncLocalStorageToCookie(key, value);
  },

  getItem: (key: string): string | null => {
    return localStorage.getItem(key);
  },

  removeItem: (key: string): void => {
    syncLocalStorageToCookie(key, null);
  },

  clear: (): void => {
    // Get all localStorage keys first
    const keys = Object.keys(localStorage);
    
    // Clear localStorage
    localStorage.clear();
    
    // Remove corresponding cookies
    keys.forEach(key => {
      removeCookie(`ls_${key}`);
    });
  }
};

/**
 * Initialize cookie sync for existing localStorage data
 * Call this function on app startup to sync existing localStorage data to cookies
 */
export function initializeLocalStorageCookieSync(): void {
  try {
    // Sync all existing localStorage items to cookies
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          setCookie(`ls_${key}`, value, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            secure: window.location.protocol === 'https:',
            sameSite: 'Lax'
          });
        }
      }
    }
  } catch (error) {
    console.warn('Failed to initialize localStorage to cookie sync:', error);
  }
}

/**
 * Get all localStorage data as an object (useful for debugging)
 */
export function getAllLocalStorageData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = value;
      }
    }
  }
  return data;
}

/**
 * Get all cookie data as an object (useful for debugging)
 */
export function getAllCookieData(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  
  const data: Record<string, string> = {};
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed) {
      const [name, value] = trimmed.split('=');
      if (name && value) {
        data[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }
  }
  
  return data;
}

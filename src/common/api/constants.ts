// API Base URL configuration
// In development, this should point to your backend server
// In production, this should point to your production API
export const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';

// Log the base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('API Base URL:', BASE_URL);
}

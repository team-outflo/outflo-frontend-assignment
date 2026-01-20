import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { create } from "zustand";
import { User } from "../../types/authentication";

// Utility functions to handle cookies
const setCookie = (name: string, value: string, days = 7) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
};

export interface AuthStoreState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
}

export interface AuthStoreActions {
  setState: (_data: Partial<AuthStoreState>, _cb?: () => void) => void;
  reset: () => void;
}

export const authStore = create<AuthStoreState & AuthStoreActions>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,

      setState: (data: Partial<AuthStoreState>, cb) => {
        set(() => data);

        // Update cookies whenever state changes
        if (data.isAuthenticated !== undefined) setCookie("isAuthenticated", String(data.isAuthenticated));
        if (data.user !== undefined) setCookie("user", JSON.stringify(data.user));
        if (data.accessToken !== undefined) setCookie("accessToken", data.accessToken ?? "");

        cb?.();
      },

      reset: () => {
        set({ isAuthenticated: false, user: null, accessToken: null });

        // Clear cookies
        deleteCookie("isAuthenticated");
        deleteCookie("user");
        deleteCookie("accessToken");
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useAuthStore = () => useStore(authStore);

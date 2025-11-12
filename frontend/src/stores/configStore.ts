import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultEnvironment, isValidApiUrl } from '../config/environments';

interface ConfigState {
  // API Configuration
  apiUrl: string;
  setApiUrl: (url: string) => void;
  resetApiUrl: () => void;

  // Connection Status
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  lastChecked: Date | null;
  updateLastChecked: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // API Configuration
      apiUrl: getDefaultEnvironment(),
      setApiUrl: (url: string) => {
        if (isValidApiUrl(url)) {
          set({ apiUrl: url });
        } else {
          console.error('Invalid API URL:', url);
        }
      },
      resetApiUrl: () => set({ apiUrl: getDefaultEnvironment() }),

      // Connection Status
      isOnline: false,
      setIsOnline: (status: boolean) => set({ isOnline: status }),
      lastChecked: null,
      updateLastChecked: () => set({ lastChecked: new Date() }),
    }),
    {
      name: 'config-storage',
      // Only persist apiUrl, not connection status
      partialize: (state) => ({ apiUrl: state.apiUrl }),
    }
  )
);

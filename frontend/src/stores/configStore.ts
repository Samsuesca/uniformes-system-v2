import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultEnvironment, isValidApiUrl, ENVIRONMENTS } from '../config/environments';

export type EnvironmentType = 'development' | 'lan' | 'production' | 'custom';

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

// Helper functions (outside store for simplicity)
export function getEnvironmentType(apiUrl: string): EnvironmentType {
  if (apiUrl === ENVIRONMENTS.LOCAL || apiUrl.includes('localhost')) {
    return 'development';
  }
  if (apiUrl === ENVIRONMENTS.LAN || apiUrl.startsWith('http://192.168.')) {
    return 'lan';
  }
  if (apiUrl === ENVIRONMENTS.CLOUD || apiUrl.includes('uniformes-system.com')) {
    return 'production';
  }
  return 'custom';
}

export function getEnvironmentLabel(apiUrl: string): string {
  const type = getEnvironmentType(apiUrl);
  switch (type) {
    case 'development': return 'Desarrollo';
    case 'lan': return 'Red Local';
    case 'production': return 'Producción';
    case 'custom': return 'Personalizado';
  }
}

export function getEnvironmentColor(apiUrl: string): string {
  const type = getEnvironmentType(apiUrl);
  switch (type) {
    case 'development': return 'bg-yellow-500';
    case 'lan': return 'bg-blue-500';
    case 'production': return 'bg-green-500';
    case 'custom': return 'bg-purple-500';
  }
}

export function isDevelopment(apiUrl: string): boolean {
  return getEnvironmentType(apiUrl) === 'development';
}

export function isProduction(apiUrl: string): boolean {
  return getEnvironmentType(apiUrl) === 'production';
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

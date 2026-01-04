import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDefaultEnvironment, isValidApiUrl, ENVIRONMENTS } from '../config/environments';
// Helper functions (outside store for simplicity)
export function getEnvironmentType(apiUrl) {
    if (apiUrl === ENVIRONMENTS.LOCAL || apiUrl.includes('localhost')) {
        return 'development';
    }
    if (apiUrl === ENVIRONMENTS.LAN || apiUrl.startsWith('http://192.168.')) {
        return 'lan';
    }
    if (apiUrl === ENVIRONMENTS.CLOUD || apiUrl.includes('uniformesconsuelorios.com')) {
        return 'production';
    }
    return 'custom';
}
export function getEnvironmentLabel(apiUrl) {
    const type = getEnvironmentType(apiUrl);
    switch (type) {
        case 'development': return 'Desarrollo';
        case 'lan': return 'Red Local';
        case 'production': return 'Producción';
        case 'custom': return 'Personalizado';
    }
}
export function getEnvironmentColor(apiUrl) {
    const type = getEnvironmentType(apiUrl);
    switch (type) {
        case 'development': return 'bg-yellow-500';
        case 'lan': return 'bg-blue-500';
        case 'production': return 'bg-green-500';
        case 'custom': return 'bg-purple-500';
    }
}
export function isDevelopment(apiUrl) {
    return getEnvironmentType(apiUrl) === 'development';
}
export function isProduction(apiUrl) {
    return getEnvironmentType(apiUrl) === 'production';
}
export const useConfigStore = create()(persist((set) => ({
    // API Configuration
    apiUrl: getDefaultEnvironment(),
    setApiUrl: (url) => {
        if (isValidApiUrl(url)) {
            set({ apiUrl: url });
        }
        else {
            console.error('Invalid API URL:', url);
        }
    },
    resetApiUrl: () => set({ apiUrl: getDefaultEnvironment() }),
    // Connection Status
    isOnline: false,
    setIsOnline: (status) => set({ isOnline: status }),
    lastChecked: null,
    updateLastChecked: () => set({ lastChecked: new Date() }),
}), {
    name: 'config-storage',
    // Only persist apiUrl, not connection status
    partialize: (state) => ({ apiUrl: state.apiUrl }),
}));

/**
 * Environment Configuration
 *
 * Manages API endpoints for different deployment scenarios:
 * - LOCAL: Development on same machine
 * - LAN: Testing across machines on local network
 * - CLOUD: Production deployment
 */
export const ENVIRONMENTS = {
    LOCAL: 'http://localhost:8000',
    LAN: 'http://192.168.18.48:8000', // Mac's IP on local network
    CLOUD: 'https://api.uniformesconsuelorios.com', // Production API
};
export const ENVIRONMENT_LABELS = {
    LOCAL: '💻 Local (Desarrollo)',
    LAN: '🏠 Red Local (Testing)',
    CLOUD: '☁️ Nube (Producción)',
};
export const ENVIRONMENT_DESCRIPTIONS = {
    LOCAL: 'Servidor en esta misma computadora (localhost)',
    LAN: 'Servidor en otra computadora de la red local',
    CLOUD: 'Servidor en la nube (internet)',
};
/**
 * Get the default environment based on build mode
 */
export function getDefaultEnvironment() {
    // Check if running in dev mode
    if (import.meta.env.DEV) {
        return ENVIRONMENTS.LOCAL;
    }
    // In production, check if there's an env variable
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
        return apiUrl;
    }
    // Default to cloud in production
    return ENVIRONMENTS.CLOUD;
}
/**
 * Validate if a URL is accessible (basic format check)
 */
export function isValidApiUrl(url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    }
    catch {
        return false;
    }
}

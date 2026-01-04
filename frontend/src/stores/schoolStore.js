/**
 * School Store - Zustand store for managing selected school
 *
 * Loads only schools the user has access to (not all schools in system)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { schoolService } from '../services/schoolService';
import { userService } from '../services/userService';
import { useAuthStore } from './authStore';
export const useSchoolStore = create()(persist((set, get) => ({
    // Initial state
    currentSchool: null,
    availableSchools: [],
    isLoading: false,
    error: null,
    // Load available schools (only user's schools, or all if superuser)
    loadSchools: async () => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            const user = authState.user;
            let schools = [];
            if (user?.is_superuser) {
                // Superusers can see all schools
                schools = await schoolService.getSchools();
            }
            else if (user?.id) {
                // Regular users only see their assigned schools
                const userSchools = await userService.getUserSchools(user.id);
                schools = userSchools
                    .filter(us => us.school.is_active)
                    .map(us => ({
                    id: us.school.id,
                    code: us.school.code,
                    name: us.school.name,
                    email: null,
                    phone: null,
                    address: null,
                    logo_url: null,
                    primary_color: null,
                    secondary_color: null,
                    is_active: us.school.is_active,
                    created_at: us.created_at,
                    updated_at: null,
                }));
            }
            set({ availableSchools: schools, isLoading: false });
            // If no school selected but schools exist, select the first one
            const { currentSchool } = get();
            if (!currentSchool && schools.length > 0) {
                set({ currentSchool: schools[0] });
            }
            // If current school was deleted or user lost access, select first available
            if (currentSchool && !schools.find(s => s.id === currentSchool.id)) {
                set({ currentSchool: schools.length > 0 ? schools[0] : null });
            }
        }
        catch (error) {
            set({
                error: error.response?.data?.detail || 'Error al cargar colegios',
                isLoading: false,
            });
        }
    },
    // Select a school
    selectSchool: (school) => {
        set({ currentSchool: school });
    },
    // Select school by ID
    selectSchoolById: async (schoolId) => {
        const { availableSchools } = get();
        // First check if already loaded
        const existing = availableSchools.find(s => s.id === schoolId);
        if (existing) {
            set({ currentSchool: existing });
            return;
        }
        // Otherwise fetch it
        try {
            const school = await schoolService.getSchool(schoolId);
            set({ currentSchool: school });
        }
        catch (error) {
            set({
                error: error.response?.data?.detail || 'Error al cargar colegio',
            });
        }
    },
    // Clear selection
    clearSchool: () => {
        set({ currentSchool: null });
    },
}), {
    name: 'school-storage',
    partialize: (state) => ({
        currentSchool: state.currentSchool,
    }),
}));
// Helper hook to get current school ID
export const useCurrentSchoolId = () => {
    const currentSchool = useSchoolStore((state) => state.currentSchool);
    return currentSchool?.id ?? null;
};

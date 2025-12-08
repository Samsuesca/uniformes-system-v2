/**
 * School Store - Zustand store for managing selected school
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { schoolService, type School } from '../services/schoolService';

interface SchoolState {
  // State
  currentSchool: School | null;
  availableSchools: School[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSchools: () => Promise<void>;
  selectSchool: (school: School) => void;
  selectSchoolById: (schoolId: string) => Promise<void>;
  clearSchool: () => void;
}

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSchool: null,
      availableSchools: [],
      isLoading: false,
      error: null,

      // Load available schools
      loadSchools: async () => {
        set({ isLoading: true, error: null });

        try {
          const schools = await schoolService.getSchools();
          set({ availableSchools: schools, isLoading: false });

          // If no school selected but schools exist, select the first one
          const { currentSchool } = get();
          if (!currentSchool && schools.length > 0) {
            set({ currentSchool: schools[0] });
          }

          // If current school was deleted, select the first available
          if (currentSchool && !schools.find(s => s.id === currentSchool.id)) {
            set({ currentSchool: schools.length > 0 ? schools[0] : null });
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Error al cargar colegios',
            isLoading: false,
          });
        }
      },

      // Select a school
      selectSchool: (school: School) => {
        set({ currentSchool: school });
      },

      // Select school by ID
      selectSchoolById: async (schoolId: string) => {
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
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Error al cargar colegio',
          });
        }
      },

      // Clear selection
      clearSchool: () => {
        set({ currentSchool: null });
      },
    }),
    {
      name: 'school-storage',
      partialize: (state) => ({
        currentSchool: state.currentSchool,
      }),
    }
  )
);

// Helper hook to get current school ID
export const useCurrentSchoolId = () => {
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  return currentSchool?.id ?? null;
};

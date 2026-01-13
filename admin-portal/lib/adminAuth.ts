import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSchoolRole {
  school_id: string;
  school_name: string;
  role: 'owner' | 'admin' | 'seller' | 'viewer';
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login?: string;
  school_roles?: UserSchoolRole[];
}

interface AdminAuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          console.log('[AdminAuth] Attempting login for:', username);

          // Login to get token
          const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });

          console.log('[AdminAuth] Login response status:', loginResponse.status);

          if (!loginResponse.ok) {
            const error = await loginResponse.json();
            console.error('[AdminAuth] Login failed:', error);
            throw new Error(error.detail || 'Credenciales incorrectas');
          }

          const loginData = await loginResponse.json();
          console.log('[AdminAuth] Login successful, user:', loginData.user.username);

          const token = loginData.token.access_token;
          const user = loginData.user;

          // Check if user has access: superuser OR has at least one school role
          const hasSchoolRoles = user.school_roles && user.school_roles.length > 0;
          console.log('[AdminAuth] User access check - is_superuser:', user.is_superuser, 'hasSchoolRoles:', hasSchoolRoles);

          if (!user.is_superuser && !hasSchoolRoles) {
            throw new Error('Acceso denegado. Necesitas ser superusuario o tener un rol asignado en algún colegio.');
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('[AdminAuth] Login complete, isAuthenticated set to true');
          return true;
        } catch (error: any) {
          console.error('[AdminAuth] Login error:', error.message);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Error al iniciar sesión',
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        console.log('[AdminAuth] checkAuth called, token exists:', !!token);

        if (!token) {
          console.log('[AdminAuth] No token, setting isAuthenticated to false');
          set({ isAuthenticated: false });
          return false;
        }

        try {
          console.log('[AdminAuth] Verifying token with /auth/me');
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log('[AdminAuth] /auth/me response status:', response.status);

          if (!response.ok) {
            throw new Error('Token inválido');
          }

          const user = await response.json();
          console.log('[AdminAuth] Token valid, user:', user.username);

          // Check if user has access: superuser OR has at least one school role
          const hasSchoolRoles = user.school_roles && user.school_roles.length > 0;
          console.log('[AdminAuth] checkAuth access - is_superuser:', user.is_superuser, 'hasSchoolRoles:', hasSchoolRoles);

          if (!user.is_superuser && !hasSchoolRoles) {
            throw new Error('Sin acceso al panel');
          }

          set({ user, isAuthenticated: true });
          console.log('[AdminAuth] checkAuth complete, isAuthenticated: true');
          return true;
        } catch (error: any) {
          console.error('[AdminAuth] checkAuth error:', error.message);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

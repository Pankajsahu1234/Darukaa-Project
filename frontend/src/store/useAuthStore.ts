import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('darukaa_access_token', accessToken);
    localStorage.setItem('darukaa_refresh_token', refreshToken);
    localStorage.setItem('darukaa_user', JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('darukaa_access_token');
    localStorage.removeItem('darukaa_refresh_token');
    localStorage.removeItem('darukaa_user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initialize: () => {
    try {
      const accessToken = localStorage.getItem('darukaa_access_token');
      const refreshToken = localStorage.getItem('darukaa_refresh_token');
      const userStr = localStorage.getItem('darukaa_user');

      if (accessToken && userStr) {
        const user = JSON.parse(userStr) as User;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

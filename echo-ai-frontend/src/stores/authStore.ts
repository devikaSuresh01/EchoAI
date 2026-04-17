import { create } from 'zustand';
import type { AuthUser } from '../services/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setAuthState: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setAuthState: (user) => {
    set({
      user,
      isLoading: false,
    });
  },
  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));

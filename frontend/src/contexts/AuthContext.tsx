import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/authService';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_translator: boolean;
  is_editor: boolean;
  role: string;
  is_active: boolean;
  is_blocked: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  is_translator: boolean;
  is_editor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        const userData = await authService.getProfile();
        console.log('User authenticated:', userData);
        setUser(userData);
      } catch (error: any) {
        console.log('User not authenticated:', error.response?.status, error.message);
        // Не перенаправляем здесь, так как это может быть на странице логина
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [clearUser]);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login...');
      const userData = await authService.login(email, password);
      console.log('Login successful, user:', userData);
      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      console.log('Attempting registration...');
      const userData = await authService.register(data);
      console.log('Registration successful, user:', userData);
      setUser(userData);
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearUser();
    }
  };

  const logoutAll = async () => {
    try {
      await authService.logoutAll();
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      clearUser();
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error) {
      clearUser();
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        loading,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
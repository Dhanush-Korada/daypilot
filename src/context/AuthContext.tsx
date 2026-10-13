import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToAuth,
  signInWithEmail,
  signUpWithEmail,
  logoutUser,
  sendPasswordReset,
} from '../services/authService';
import { createUserProfile, getUserProfile, saveUserSettings } from '../services/userService';
import { seedDefaultCategories } from '../services/categoryService';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (user: User) => {
    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        // Fallback: create profile if missing
        await createUserProfile(user.uid, {
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
        });
        await seedDefaultCategories(user.uid);
        await saveUserSettings(user.uid, { theme: 'light' });
        profile = await getUserProfile(user.uid);
      }
      setUserProfile(profile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, pass: string) => {
    const user = await signInWithEmail(email, pass);
    await fetchProfile(user);
  };

  const signup = async (email: string, pass: string, displayName?: string) => {
    const user = await signUpWithEmail(email, pass, displayName);
    // Create user profile document on signup
    await createUserProfile(user.uid, {
      email,
      displayName: displayName || email.split('@')[0],
    });
    // Seed built-in categories for each new user
    await seedDefaultCategories(user.uid);
    // Save default settings
    await saveUserSettings(user.uid, {
      theme: 'light',
      soundEnabled: true,
      hapticFeedback: true,
      defaultReminderOffset: 15,
      weekStartsOn: 1,
    });
    await fetchProfile(user);
  };

  const logout = async () => {
    await logoutUser();
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

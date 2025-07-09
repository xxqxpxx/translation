import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'interpreter' | 'admin';
  isActive: boolean;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: () => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { isSignedIn, signOut, getToken } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (isLoaded) {
        if (isSignedIn && clerkUser) {
          // Transform Clerk user to our User type
          const transformedUser: User = {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            role: 'client', // Default role, will be updated from backend
            isActive: true,
            avatarUrl: clerkUser.imageUrl,
          };

          setUser(transformedUser);

          // Sync with backend to get actual user data
          try {
            const token = await getToken();
            if (token) {
              const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/profile`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                const backendUser = await response.json();
                if (backendUser.success && backendUser.data) {
                  setUser({
                    ...transformedUser,
                    role: backendUser.data.role,
                    isActive: backendUser.data.isActive,
                  });
                }
              }
            }
          } catch (error) {
            console.error('Failed to sync user with backend:', error);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    };

    loadUser();
  }, [isLoaded, isSignedIn, clerkUser, getToken]);

  const login = () => {
    // Clerk handles the redirect to login
    window.location.href = '/sign-in';
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await getToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isSignedIn: isSignedIn || false,
    login,
    logout,
    getToken: getAuthToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
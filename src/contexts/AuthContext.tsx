
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession) {
          // Get user profile from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profile) {
            setUser({
              id: currentSession.user.id,
              name: profile.username || currentSession.user.email?.split('@')[0] || 'User',
              isAdmin: profile.is_admin || false
            });
          } else {
            console.warn('No profile found for user, may need to wait for trigger');
            // Set basic user info without profile
            setUser({
              id: currentSession.user.id,
              name: currentSession.user.email?.split('@')[0] || 'User',
              isAdmin: false
            });
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.id);
      setSession(newSession);
      
      if (newSession) {
        try {
          // Get user profile when auth state changes
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          
          if (profile) {
            setUser({
              id: newSession.user.id,
              name: profile.username || newSession.user.email?.split('@')[0] || 'User',
              isAdmin: profile.is_admin || false
            });
          } else {
            console.warn('No profile found for user on auth change, may need to wait for trigger');
            // Set basic user info without profile
            setUser({
              id: newSession.user.id,
              name: newSession.user.email?.split('@')[0] || 'User',
              isAdmin: false
            });
          }
        } catch (error) {
          console.error('Error fetching profile on auth change:', error);
        }
      } else {
        setUser(null);
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Login error:', error.message);
        return { error: error.message };
      }
      
      console.log('Login successful');
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      return { error: error.message || 'An error occurred during login' };
    }
  };

  // Signup function
  const signup = async (email: string, password: string) => {
    try {
      console.log('Attempting signup with:', email);
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        console.error('Signup error:', error.message);
        return { error: error.message };
      }
      
      console.log('Signup successful or confirmation email sent');
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return { error: error.message || 'An error occurred during signup' };
    }
  };

  // Logout function
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      signup,
      logout,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

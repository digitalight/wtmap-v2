'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback hook for when not using provider
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();
    const initRef = useRef(false);

    useEffect(() => {
      // Prevent duplicate initialization in strict mode
      if (initRef.current) return;
      initRef.current = true;

      const getUser = async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          setUser(user);
        } catch (error) {
          console.error('Error getting user:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      };

      getUser();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    };

    const signUp = async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
    };

    const signOut = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    };

    return { user, loading, signIn, signUp, signOut };
  }
  return context;
};
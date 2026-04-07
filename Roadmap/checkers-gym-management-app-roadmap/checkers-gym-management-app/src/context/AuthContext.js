import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { fetchProfile } from '../services/gymService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncFromSession = useCallback(async (nextSession) => {
    setSession(nextSession || null);
    setUser(nextSession?.user || null);

    if (!isSupabaseConfigured || !nextSession?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const nextProfile = await fetchProfile(nextSession.user.id);
      setProfile(nextProfile || null);
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return undefined;
    }

    const initialise = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      await syncFromSession(data?.session || null);
    };

    initialise();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncFromSession(nextSession || null);
    });

    return () => {
      isActive = false;
      listener?.subscription?.unsubscribe();
    };
  }, [syncFromSession]);

  const refreshProfile = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      return null;
    }

    const nextProfile = await fetchProfile(user.id);
    setProfile(nextProfile || null);
    return nextProfile;
  }, [user]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured || !supabase) {
      return { data: null, error: new Error('Supabase is not configured.') };
    }

    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.data?.session) {
      await syncFromSession(result.data.session);
    }

    return result;
  }, [syncFromSession]);

  const signUp = useCallback(async ({ fullName, email, password }) => {
    if (!isSupabaseConfigured || !supabase) {
      return { data: null, error: new Error('Supabase is not configured.') };
    }

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (result.data?.session) {
      await syncFromSession(result.data.session);
    }

    return result;
  }, [syncFromSession]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    isConfigured: isSupabaseConfigured,
    refreshProfile,
    signIn,
    signUp,
    signOut,
  }), [loading, profile, refreshProfile, session, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

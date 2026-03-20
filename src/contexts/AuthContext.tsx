import React, { createContext, useContext, useEffect, useState } from 'react';
import { withTimeout } from '@/lib/utils';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'social_media' | 'client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  theme: string;
  approved: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: AppRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await withTimeout(Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.rpc('get_user_role', { _user_id: userId }),
      ]));
      
      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
        console.log('Profile fetched:', profileRes.data);
      } else if (profileRes.error) {
        console.warn('Error fetching profile:', profileRes.error);
      }
      
      if (roleRes.data) {
        setRole(roleRes.data as AppRole);
        console.log('Role fetched:', roleRes.data);
      } else if (roleRes.error) {
        console.warn('Error fetching role:', roleRes.error);
      }
    } catch (err) {
      console.error('Fatal error in fetchProfileAndRole:', err);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing...');
    let mounted = true;

    // Fallback timeout: if still loading after 5 seconds, force stop loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthContext: Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('AuthContext: onAuthStateChange event:', _event);
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        try {
          if (session?.user) {
            await fetchProfileAndRole(session.user.id);
          } else {
            setProfile(null);
            setRole(null);
          }
        } catch (err) {
          console.error('AuthContext: Error in onAuthStateChange handler:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('AuthContext: getSession completed');
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      try {
        if (session?.user) {
          await fetchProfileAndRole(session.user.id);
        }
      } catch (err) {
        console.error('AuthContext: Error in getSession handler:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }).catch(err => {
      console.error('AuthContext: getSession failed:', err);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string, role: AppRole) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRole(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, refreshProfile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

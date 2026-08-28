import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerForPushNotificationsAsync } from '../lib/push';
import { supabase } from '../lib/supabase';
import type { AppRole } from '../lib/auth-routing';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthorizationLoading: boolean;
  role: AppRole;
  isAdmin: boolean;
  isBanned: boolean;
  providerVerificationStatus: 'pending' | 'approved' | 'rejected' | null;
  refreshAuthorization: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthorizationLoading: true,
  role: null,
  isAdmin: false,
  isBanned: false,
  providerVerificationStatus: null,
  refreshAuthorization: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<AppRole>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [providerVerificationStatus, setProviderVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  // Роль приезжает отдельным запросом уже после того, как сессия готова, поэтому
  // до его завершения role === null неотличим от «роль ещё не выбрана».
  // Запоминаем, для кого права реально загружены, чтобы никто не принял
  // промежуточное состояние за нового пользователя без роли.
  const [authorizedUserId, setAuthorizedUserId] = useState<string | null>(null);

  async function loadAuthorization(userId?: string) {
    if (!userId) {
      setRole(null);
      setIsAdmin(false);
      setIsBanned(false);
      setProviderVerificationStatus(null);
      setAuthorizedUserId(null);
      return;
    }
    const [{ data: profile, error }, { data: admin }, { data: verification }] = await Promise.all([
      supabase.from('profiles').select('role, is_banned').eq('id', userId).maybeSingle(),
      supabase.rpc('is_admin'),
      supabase.from('provider_verifications').select('status').eq('provider_id', userId).maybeSingle(),
    ]);
    if (error) throw error;
    setRole((profile?.role as AppRole) || null);
    setIsBanned(Boolean(profile?.is_banned));
    setIsAdmin(Boolean(admin));
    setProviderVerificationStatus(verification?.status ?? null);
    setAuthorizedUserId(userId);
  }

  async function refreshAuthorization() {
    await loadAuthorization(session?.user.id);
  }

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          if (session?.user) {
            await loadAuthorization(session.user.id);
            registerForPushNotificationsAsync();
          } else {
            await loadAuthorization();
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        // САМОЕ ВАЖНОЕ: Отключаем загрузку в любом случае!
        if (mounted) setIsLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        // Также гарантируем, что загрузка выключена при смене статуса
        setIsLoading(false); 
        void loadAuthorization(session?.user.id).catch((error) => console.error('Authorization refresh failed:', error));
        if (_event === 'SIGNED_IN' && session?.user) registerForPushNotificationsAsync();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const channel = supabase
      .channel(`authorization:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        setRole((payload.new.role as AppRole) || null);
        setIsBanned(Boolean(payload.new.is_banned));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const channel = supabase
      .channel(`provider-verification:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'provider_verifications',
        filter: `provider_id=eq.${userId}`,
      }, (payload) => {
        const next = payload.eventType === 'DELETE' ? null : payload.new.status;
        setProviderVerificationStatus(next === 'pending' || next === 'approved' || next === 'rejected' ? next : null);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading,
      isAuthorizationLoading: session !== null && authorizedUserId !== session.user.id,
      role,
      isAdmin,
      isBanned,
      providerVerificationStatus,
      refreshAuthorization,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

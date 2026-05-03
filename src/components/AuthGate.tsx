import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Index from "@/pages/Index";
import AuthPage, { type AuthPageMode } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthSession, ensureAuthSessionStarted, isAuthSessionExpired } from "@/lib/authSession";
import { ensureOwnProfile } from "@/lib/profiles";

const AuthGate = () => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthPageMode | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session) {
        clearAuthSession();
        setSession(null);
        return;
      }

      if (isAuthSessionExpired()) {
        clearAuthSession();
        await supabase.auth.signOut();
        setSession(null);
        setShowAuth(true);
        return;
      }

      ensureAuthSessionStarted();

      // Confirm the stored auth state is still valid before treating the user as signed in.
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !userData.user) {
        clearAuthSession();
        setSession(null);
        return;
      }

      void ensureOwnProfile(userData.user.id, (userData.user.user_metadata?.full_name as string | undefined) ?? null);
      setSession(data.session);
    };

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        clearAuthSession();
        setSession(null);
        return;
      }

      if (nextSession && isAuthSessionExpired()) {
        clearAuthSession();
        setSession(null);
        setShowAuth(true);
        void supabase.auth.signOut();
        return;
      }

      if (event === "SIGNED_IN") {
        ensureAuthSessionStarted();
        if (nextSession?.user) {
          void ensureOwnProfile(
            nextSession.user.id,
            (nextSession.user.user_metadata?.full_name as string | undefined) ?? null,
          );
        }
      }

      setSession(nextSession);

      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset-password");
        setShowAuth(true);
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        setShowAuth(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session && authMode !== "reset-password") {
      setShowAuth(false);
    }
  }, [session, authMode]);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="bg-card rounded-3xl shadow-card p-8 w-full max-w-sm text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">AI Mentor</p>
          <h1 className="text-2xl font-bold text-foreground mt-3">Loading your study space</h1>
          <p className="text-sm text-muted-foreground mt-2">Make sure you are connected to the internet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Index
        isAuthenticated={Boolean(session)}
        onRequireAuth={() => {
          setAuthMode(null);
          setShowAuth(true);
        }}
      />
      {showAuth && (
        <AuthPage
          variant="modal"
          initialMode={authMode}
          onClose={() => {
            setShowAuth(false);
            setAuthMode(null);
          }}
        />
      )}
    </>
  );
};

export default AuthGate;

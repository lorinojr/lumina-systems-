import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function usePlatformAuth() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformName,    setPlatformName]    = useState<string | null>(null);
  // Bearer session token issued by the server at login. Lives only in memory
  // (never localStorage) so it clears on reload, forcing a fresh login.
  const [token,           setToken]           = useState<string | null>(null);

  /** Verifies credentials against the server-side platform_admins table. */
  const loginPlatformAdmin = useCallback(async (email: string, pin: string): Promise<boolean> => {
    if (!email.trim() || !pin) return false;
    try {
      const { data, error } = await supabase.rpc('authenticate_platform_admin', {
        p_email: email.trim().toLowerCase(),
        p_pin:   pin,
      });
      if (error || !data?.success || !data?.token) return false;
      setIsPlatformAdmin(true);
      setPlatformName((data.name as string) ?? email.trim());
      setToken(data.token as string);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logoutPlatformAdmin = useCallback(() => {
    // Best-effort server-side token revocation; clear local state regardless.
    if (token) supabase.rpc('logout_platform_admin', { p_token: token }).then(() => {}, () => {});
    setIsPlatformAdmin(false);
    setPlatformName(null);
    setToken(null);
  }, [token]);

  return { isPlatformAdmin, platformName, token, loginPlatformAdmin, logoutPlatformAdmin };
}

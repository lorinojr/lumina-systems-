import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function usePlatformAuth() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformName,    setPlatformName]    = useState<string | null>(null);

  /** Verifies credentials against the server-side platform_admins table. */
  const loginPlatformAdmin = useCallback(async (email: string, pin: string): Promise<boolean> => {
    if (!email.trim() || !pin) return false;
    try {
      const { data, error } = await supabase.rpc('authenticate_platform_admin', {
        p_email: email.trim().toLowerCase(),
        p_pin:   pin,
      });
      if (error || !data?.success) return false;
      setIsPlatformAdmin(true);
      setPlatformName((data.name as string) ?? email.trim());
      return true;
    } catch {
      return false;
    }
  }, []);

  const logoutPlatformAdmin = useCallback(() => {
    setIsPlatformAdmin(false);
    setPlatformName(null);
  }, []);

  return { isPlatformAdmin, platformName, loginPlatformAdmin, logoutPlatformAdmin };
}

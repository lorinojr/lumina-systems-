import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY  = 'lumina_platform_key_v2';
const DEFAULT_USER = 'lorenserodriguesjunior@gmail.com';
const DEFAULT_PIN  = '12345678';

function encode(username: string, pin: string): string {
  return btoa(`platform:${username.toLowerCase().trim()}:${pin}:lumina`);
}

export function usePlatformAuth() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformName,    setPlatformName]    = useState<string | null>(null);

  // Seed default credentials on first run
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, encode(DEFAULT_USER, DEFAULT_PIN));
    }
  }, []);

  /** Returns true if credentials match the stored key */
  const loginPlatformAdmin = useCallback((username: string, pin: string): boolean => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || !username.trim() || !pin) return false;
    try {
      const ok = stored === encode(username, pin);
      if (ok) {
        setIsPlatformAdmin(true);
        setPlatformName(username.trim());
      }
      return ok;
    } catch {
      return false;
    }
  }, []);

  const logoutPlatformAdmin = useCallback(() => {
    setIsPlatformAdmin(false);
    setPlatformName(null);
  }, []);

  /** Replace stored credentials (e.g. after first-time setup) */
  const setupPlatformAdmin = useCallback((username: string, pin: string): void => {
    localStorage.setItem(STORAGE_KEY, encode(username, pin));
  }, []);

  return {
    isPlatformAdmin,
    platformName,
    loginPlatformAdmin,
    logoutPlatformAdmin,
    setupPlatformAdmin,
  };
}

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'lumina_store_config';

export interface StoreConfig {
  storeId:    string;
  storeName:  string;
  ownerPhone: string;
}

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoreConfig;
      if (!parsed.storeId || !parsed.storeName?.trim()) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  const saveConfig = useCallback((c: StoreConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setConfig(c);
  }, []);

  const clearConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
  }, []);

  return { config, saveConfig, clearConfig };
}

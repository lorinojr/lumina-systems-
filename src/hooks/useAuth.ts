import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Role, ActiveModule } from '../types';

// ─── Cashier record (returned by Supabase, no PIN hash exposed) ──────────────
export interface CashierRecord {
  id:     string;
  name:   string;
  role:   string;
  active: boolean;
}

// ─── Permission table ────────────────────────────────────────────────────────
const MODULE_ACCESS: Record<Role, ActiveModule[]> = {
  platform_admin: ['pos', 'inventory', 'reports', 'security', 'team', 'platform'],
  store_admin:    ['pos', 'inventory', 'reports', 'security', 'team'],
  cashier:        ['pos'],
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth(storeId: string | null) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cashiers, setCashiers] = useState<CashierRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Load cashiers from Supabase on mount / storeId change ────────────────
  const loadCashiers = useCallback(async () => {
    if (!storeId) { setCashiers([]); return; }
    try {
      const { data, error } = await supabase.rpc('list_store_users', { p_store_id: storeId });
      if (error) throw error;
      const list: CashierRecord[] = (data ?? []) as CashierRecord[];
      setCashiers(list);
    } catch (e) {
      console.error('loadCashiers:', e);
    }
  }, [storeId]);

  useEffect(() => { loadCashiers(); }, [loadCashiers]);

  // ── Login: cashier ───────────────────────────────────────────────────────
  const loginCashier = useCallback(async (cashierId: string, pin: string): Promise<boolean> => {
    if (!storeId) return false;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_store_id: storeId, p_user_id: cashierId, p_pin: pin,
      });
      if (error || !data?.success) return false;
      setCurrentUser({
        id: data.user_id, storeId, role: data.role as Role,
        name: data.name, active: true,
      });
      return true;
    } catch { return false; }
    finally { setLoading(false); }
  }, [storeId]);

  // ── Login: store admin ───────────────────────────────────────────────────
  const loginStoreAdmin = useCallback(async (pin: string): Promise<boolean> => {
    if (!storeId) return false;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('authenticate_admin', {
        p_store_id: storeId, p_pin: pin,
      });
      if (error || !data?.success) return false;
      setCurrentUser({
        id: data.user_id, storeId, role: 'store_admin' as Role,
        name: data.name, active: true,
      });
      return true;
    } catch { return false; }
    finally { setLoading(false); }
  }, [storeId]);

  // ── Verify admin PIN without creating session ─────────────────────────
  const verifyAdminPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!storeId) return false;
    try {
      const { data } = await supabase.rpc('authenticate_admin', {
        p_store_id: storeId, p_pin: pin,
      });
      return !!data?.success;
    } catch { return false; }
  }, [storeId]);

  const logout = useCallback(() => setCurrentUser(null), []);

  // ── Role helpers ──────────────────────────────────────────────────────────
  const canAccess = useCallback((module: ActiveModule): boolean => {
    if (!currentUser) return false;
    return MODULE_ACCESS[currentUser.role].includes(module);
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'store_admin' || currentUser?.role === 'platform_admin';

  // ── Cashier CRUD (all server-side) ────────────────────────────────────────
  const addCashier = useCallback(async (name: string, pin: string): Promise<CashierRecord | null> => {
    if (!storeId) return null;
    try {
      const { data, error } = await supabase.rpc('add_cashier', {
        p_store_id: storeId, p_name: name.trim(), p_pin: pin,
      });
      if (error) throw error;
      const record = data as CashierRecord;
      setCashiers(prev => [...prev, record]);
      return record;
    } catch (e) {
      console.error('addCashier:', e);
      return null;
    }
  }, [storeId]);

  const removeCashier = useCallback(async (id: string): Promise<boolean> => {
    if (!storeId) return false;
    try {
      const { data, error } = await supabase.rpc('remove_cashier', {
        p_store_id: storeId, p_user_id: id,
      });
      if (error || !data?.success) return false;
      setCashiers(prev => prev.filter(c => c.id !== id));
      setCurrentUser(u => u?.id === id ? null : u);
      return true;
    } catch { return false; }
  }, [storeId]);

  const changeCashierPIN = useCallback(async (id: string, newPin: string): Promise<boolean> => {
    if (!storeId) return false;
    try {
      const { data, error } = await supabase.rpc('set_user_pin', {
        p_store_id: storeId, p_user_id: id, p_new_pin: newPin,
      });
      if (error || !data?.success) return false;
      return true;
    } catch { return false; }
  }, [storeId]);

  // ── Admin PIN management ──────────────────────────────────────────────────
  const changePIN = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    if (!storeId || !currentUser) return false;
    try {
      const { data, error } = await supabase.rpc('change_user_pin', {
        p_store_id: storeId, p_user_id: currentUser.id, p_old_pin: oldPin, p_new_pin: newPin,
      });
      if (error || !data?.success) return false;
      return true;
    } catch { return false; }
  }, [storeId, currentUser]);

  return {
    currentUser,
    loading,

    loginCashier,
    loginStoreAdmin,
    verifyAdminPin,
    logout,

    canAccess,
    isAdmin,

    cashiers,
    loadCashiers,
    addCashier,
    removeCashier,
    changeCashierPIN,

    changePIN,
  };
}

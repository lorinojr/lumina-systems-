"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShoppingCart, Package, ChartLineUp, ShieldCheck,
  CheckCircle, X, WifiHigh, WifiSlash, UsersThree, LockOpen, Spinner, Buildings,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Product, Sale, ActiveModule, Return, CashReconciliation } from './types';
import { MOCK_PRODUCTS } from './data/mockData';
import * as api from './api/client';
import { supabase } from './lib/supabase';
import { replayAll, queueSize } from './lib/offlineQueue';
import { POSModule }            from './components/POSModule';
import { useKillSwitch }        from './hooks/useKillSwitch';
import { useStoreConfig }       from './hooks/useStoreConfig';
import { useAuth }              from './hooks/useAuth';
import { usePlatformAuth }      from './hooks/usePlatformAuth';
import { KillSwitchOverlay }    from './components/KillSwitchOverlay';
import { GracePeriodBanner }    from './components/GracePeriodBanner';
import { Day4ReminderModal }    from './components/Day4ReminderModal';
import { OnboardingScreen }     from './components/OnboardingScreen';
import { AdminLoginModal }      from './components/AdminLoginModal';
import { CashierLoginScreen }    from './components/CashierLoginScreen';
import { PlatformLoginModal }   from './components/PlatformLoginModal';
import { ErrorBoundary }        from './components/ErrorBoundary';

const InventoryModule = lazy(() => import('./components/InventoryModule').then(m => ({ default: m.InventoryModule })));
const ReportsModule   = lazy(() => import('./components/ReportsModule').then(m => ({ default: m.ReportsModule })));
const SecurityModule  = lazy(() => import('./components/SecurityModule').then(m => ({ default: m.SecurityModule })));
const TeamModule      = lazy(() => import('./components/TeamModule').then(m => ({ default: m.TeamModule })));
const ReturnsModal    = lazy(() => import('./components/ReturnsModal').then(m => ({ default: m.ReturnsModal })));
const CashReconciliationModal = lazy(() => import('./components/CashReconciliationModal').then(m => ({ default: m.CashReconciliationModal })));
const BulkImportModal  = lazy(() => import('./components/BulkImportModal').then(m => ({ default: m.BulkImportModal })));
const PlatformModule   = lazy(() => import('./components/PlatformModule').then(m => ({ default: m.PlatformModule })));

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

function ModuleLoader() {
  return <div className="flex-1 flex items-center justify-center"><Spinner size={24} className="text-accent animate-spin" /></div>;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, x: '-50%', scale: 0.96 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -8, x: '-50%', scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed top-3 left-1/2 z-[3000] flex items-center gap-3 pl-3 pr-4 py-2.5 bg-white rounded-xl shadow-lg border border-black/[0.06] min-w-[280px] max-w-[480px]"
    >
      <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
        <CheckCircle size={16} weight="fill" className="text-success" />
      </div>
      <p className="text-[13px] font-semibold text-ink flex-1 leading-tight">{message}</p>
      <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-muted hover:bg-black/5 transition-colors shrink-0">
        <X size={13} weight="bold" />
      </button>
    </motion.div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const ALL_NAV_ITEMS = [
  { id: 'pos',       icon: ShoppingCart, label: 'POS',        shortcut: '1' },
  { id: 'inventory', icon: Package,      label: 'Inventário',  shortcut: '2' },
  { id: 'reports',   icon: ChartLineUp,  label: 'Relatórios',  shortcut: '3' },
  { id: 'security',  icon: ShieldCheck,  label: 'Definições',  shortcut: '4' },
  { id: 'team',      icon: UsersThree,   label: 'Equipa',      shortcut: '5' },
] as const;

function Sidebar({ active, onChange, canAccess, isAdmin, onLock, onCashierLogout, isPlatformAdmin, onPlatformClick }: {
  active: ActiveModule; onChange: (m: ActiveModule) => void;
  canAccess: (m: ActiveModule) => boolean; isAdmin: boolean; onLock: () => void;
  onCashierLogout: () => void;
  isPlatformAdmin: boolean; onPlatformClick: () => void;
}) {
  const visibleItems = ALL_NAV_ITEMS.filter(item => canAccess(item.id as ActiveModule));
  const platformActive = active === 'platform' && isPlatformAdmin;
  return (
    <nav className="w-[60px] shrink-0 bg-surface border-r border-black/[0.06] flex flex-col items-center py-3 gap-0.5 z-30">
      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center mb-4 shrink-0">
        <span className="text-white text-[11px] font-black">L</span>
      </div>
      {visibleItems.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id as ActiveModule)}
            title={`${item.label} (Ctrl+${item.shortcut})`}
            className={cn('relative w-11 rounded-xl flex flex-col items-center justify-center py-2 gap-0.5 transition-all',
              isActive ? 'bg-accent text-white shadow-sm shadow-accent/30' : 'text-muted hover:bg-black/[0.05] hover:text-ink')}>
            <item.icon size={17} weight={isActive ? 'fill' : 'bold'} />
            <span className={cn('text-[8.5px] font-bold leading-none tracking-wide', isActive ? 'text-white/80' : 'text-muted/70')}>
              {item.label.slice(0, 5)}
            </span>
          </button>
        );
      })}

      {/* Bottom controls — lock / cashier logout / platform */}
      <div className="mt-auto flex flex-col items-center gap-1 pb-0.5">
        {isAdmin && (
          <button onClick={onLock} title="Bloquear sessão"
            className="w-11 rounded-xl flex flex-col items-center justify-center py-2 gap-0.5 transition-all text-success hover:bg-success/10">
            <LockOpen size={15} weight="bold" />
            <span className="text-[7.5px] font-bold leading-none tracking-wide" style={{ color: 'inherit' }}>Admin</span>
          </button>
        )}
        {!isAdmin && (
          <button onClick={onCashierLogout} title="Terminar turno"
            className="w-11 rounded-xl flex flex-col items-center justify-center py-2 gap-0.5 transition-all text-muted hover:bg-black/[0.05] hover:text-ink">
            <LockOpen size={15} weight="bold" />
            <span className="text-[7.5px] font-bold leading-none tracking-wide" style={{ color: 'inherit' }}>Turno</span>
          </button>
        )}
        {/* Platform admin entry point — subtle, always visible */}
        <button
          onClick={onPlatformClick}
          title="Plataforma Lumina (Ctrl+Shift+P)"
          className="w-11 h-8 rounded-xl flex items-center justify-center transition-all"
          style={platformActive
            ? { background: 'oklch(0.48 0.20 280)', color: 'white', boxShadow: '0 2px 8px oklch(0.48 0.20 280 / 0.30)' }
            : isPlatformAdmin
            ? { color: 'oklch(0.52 0.18 280)' }
            : { color: 'oklch(0.72 0 0)', opacity: 0.35 }}>
          <Buildings size={14} weight={platformActive ? 'fill' : 'bold'} />
        </button>
      </div>
    </nav>
  );
}

// ─── Title bar ───────────────────────────────────────────────────────────────
function TitleBar({ active, backendOnline, storeName, pendingOps, userName }: {
  active: ActiveModule; backendOnline: boolean; storeName?: string; pendingOps: number; userName?: string;
}) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const label = active === 'platform' ? 'Plataforma' : (ALL_NAV_ITEMS.find(n => n.id === active)?.label ?? '');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div className="h-9 bg-white border-b border-black/[0.06] flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black text-muted uppercase tracking-widest">{storeName ?? 'Lumina POS'}</span>
        <span className="text-black/10">·</span>
        <span className="text-[11px] font-semibold text-ink">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        {userName && (<><span className="font-semibold text-muted">{userName}</span><div className="w-px h-3 bg-black/[0.07]" /></>)}
        <div className="flex items-center gap-1.5 text-muted"
          title={backendOnline ? 'Servidor online' : `Servidor offline${pendingOps > 0 ? ` — ${pendingOps} pendente(s)` : ''}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-success animate-pulse' : 'bg-warning'}`} />
          <span className="font-semibold">{backendOnline ? 'Online' : 'Offline'}</span>
          {!backendOnline && pendingOps > 0 && <span className="px-1 py-px bg-warning/20 text-warning text-[9px] font-black rounded-full leading-none">{pendingOps}</span>}
        </div>
        <div className="w-px h-3 bg-black/[0.07]" />
        <div className="flex items-center gap-1.5 text-muted">
          {online ? <WifiHigh size={13} weight="bold" /> : <WifiSlash size={13} weight="bold" className="text-warning" />}
          <span className="font-semibold">{online ? 'Rede OK' : 'Sem rede'}</span>
        </div>
        <div className="w-px h-3 bg-black/[0.07]" />
        <span className="font-mono font-bold text-ink">
          {time.toLocaleTimeString('pt', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { config, saveConfig, clearConfig } = useStoreConfig();
  const auth         = useAuth(config?.storeId ?? null);
  const platformAuth = usePlatformAuth();

  const [activeModule, setActiveModule] = useState<ActiveModule>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const [backendOnline, setBackendOnline] = useState(false);
  const [pendingOps, setPendingOps] = useState(() => queueSize());
  const [lockedTarget, setLockedTarget] = useState<ActiveModule | null>(null);
  const [saleNo, setSaleNo] = useState(1);
  const [shiftStartMs]       = useState(() => Date.now());
  const [showPlatformLogin, setShowPlatformLogin] = useState(false);

  // Modal states
  const [showReturns, setShowReturns] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ── Set store_id in API client ─────────────────────────────────
  useEffect(() => { api.setStoreId(config?.storeId ?? null); }, [config?.storeId]);

  // ── Bootstrap ──────────────────────────────────────────────────
  useEffect(() => {
    if (!config?.storeId) return;
    api.checkHealth().then(ok => {
      setBackendOnline(ok);
      if (!ok) { setProductsLoading(false); return; }
      api.fetchProducts()
        .then(ps => { setProducts(ps); })
        .catch(console.error)
        .finally(() => setProductsLoading(false));
      api.fetchSales().then(ss => setSales(ss)).catch(console.error);
      // Peek next sale number (no longer increments the DB counter)
      api.nextSaleNumber().then(n => setSaleNo(n)).catch(console.error);
    });
  }, [config?.storeId]);

  // ── Realtime subscriptions (scoped to this store) ──────────────
  useEffect(() => {
    if (!config?.storeId || !backendOnline) return;
    const storeId = config.storeId;
    const prodSub = api.subscribeProducts(storeId, () => {
      api.fetchProducts().then(ps => setProducts(ps)).catch(console.error);
    });
    const saleSub = api.subscribeSales(storeId, () => {
      api.fetchSales().then(ss => setSales(ss)).catch(console.error);
    });
    return () => { prodSub.unsubscribe(); saleSub.unsubscribe(); };
  }, [config?.storeId, backendOnline]);

  // ── Connectivity monitoring + offline replay ───────────────────
  useEffect(() => {
    const onOnline = async () => {
      const ok = await api.checkHealth();
      setBackendOnline(ok);
      if (ok) {
        const replayed = await replayAll(api.replayOperation);
        setPendingOps(queueSize());
        if (replayed > 0) notify(`${replayed} operação(ões) sincronizada(s).`);
      }
    };
    const onOffline = () => setBackendOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // ── Kill switch ────────────────────────────────────────────────
  const killSwitch = useKillSwitch(config?.storeId ?? null, config?.ownerPhone ?? '841234567');

  // ── Keyboard ───────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (platformAuth.isPlatformAdmin) setActiveModule('platform');
        else setShowPlatformLogin(true);
        return;
      }
      if (e.shiftKey) return;
      const map: Record<string, ActiveModule> = { '1': 'pos', '2': 'inventory', '3': 'reports', '4': 'security', '5': 'team' };
      const m = map[e.key];
      if (m && auth.canAccess(m)) { e.preventDefault(); setActiveModule(m); }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [auth, platformAuth.isPlatformAdmin]);

  useEffect(() => {
    if (activeModule === 'platform' && platformAuth.isPlatformAdmin) return;
    if (!auth.canAccess(activeModule)) setActiveModule('pos');
  }, [auth.currentUser, activeModule, platformAuth.isPlatformAdmin]);

  const notify = useCallback((msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3500); }, []);

  const handlePlatformLogin = useCallback(async (username: string, pin: string): Promise<boolean> => {
    const ok = await platformAuth.loginPlatformAdmin(username, pin);
    if (ok) setActiveModule('platform');
    return ok;
  }, [platformAuth]);

  const handlePlatformLogout = useCallback(() => {
    platformAuth.logoutPlatformAdmin();
    setActiveModule('pos');
  }, [platformAuth]);

  // ── Product operations ─────────────────────────────────────────
  const saveProduct = useCallback((p: Product) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      return idx >= 0 ? prev.map((x, i) => i === idx ? p : x) : [...prev, p];
    });
    if (backendOnline) api.upsertProduct(p).catch(console.error);
    else { api.upsertProductOffline(p); setPendingOps(queueSize()); }
  }, [backendOnline]);

  const updateStock = useCallback((id: string, delta: number) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p);
      const updated = next.find(p => p.id === id);
      if (updated) {
        if (backendOnline) api.syncStock(id, updated.stock).catch(console.error);
        else { api.syncStockOffline(id, updated.stock); setPendingOps(queueSize()); }
      }
      return next;
    });
  }, [backendOnline]);

  // ── Sale recording (with persistent sale number) ───────────────
  const recordSale = useCallback((sale: Sale) => {
    setSales(prev => [sale, ...prev]);
    sale.items.forEach(item => {
      setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p));
    });
    if (backendOnline) {
      api.recordSale(sale).then(() => {
        // Fetch next number after successful save
        api.nextSaleNumber().then(n => setSaleNo(n)).catch(console.error);
      }).catch(e => {
        console.error('recordSale failed, queuing offline:', e);
        notify('Venda guardada localmente — sem ligação ao servidor.');
        api.recordSaleOffline(sale);
        setPendingOps(queueSize());
        setSaleNo(n => n + 1);
      });
    } else {
      api.recordSaleOffline(sale);
      setPendingOps(queueSize());
      setSaleNo(n => n + 1);
    }
  }, [backendOnline, notify]);

  // ── Returns ────────────────────────────────────────────────────
  const handleProcessReturn = useCallback(async (ret: Return) => {
    const result = await api.processReturn(ret);
    if (result) {
      ret.items.forEach(item => {
        setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p));
      });
    }
    return result;
  }, []);

  // ── Reconciliation ─────────────────────────────────────────────
  const handleSaveReconciliation = useCallback(async (rec: CashReconciliation) => {
    return api.saveReconciliation(rec);
  }, []);

  // ── Store info sync ────────────────────────────────────────────
  const handleUpdateStoreInfo = useCallback(async (name: string, phone: string): Promise<boolean> => {
    if (!config?.storeId) return false;
    try {
      const { data, error } = await supabase.rpc('update_store_info', {
        p_store_id:    config.storeId,
        p_store_name:  name,
        p_owner_phone: phone,
      });
      if (error || !data?.success) return false;
      saveConfig({ ...config, storeName: name, ownerPhone: phone });
      return true;
    } catch { return false; }
  }, [config, saveConfig]);

  // ── Bulk import ────────────────────────────────────────────────
  const handleBulkImport = useCallback(async (products: Product[]) => {
    const count = await api.bulkUpsertProducts(products);
    if (count > 0) {
      const fresh = await api.fetchProducts();
      if (fresh.length > 0) setProducts(fresh);
    }
    return count;
  }, []);

  // ─── Persistent overlays ──────────────────────────────────────
  const persistentOverlays = (
    <>
      {killSwitch.state === 'locked' && (
        <KillSwitchOverlay
          config={killSwitch.config}
          onCallSupport={() => notify(`Suporte: ${killSwitch.config.supportPhone}`)}
        />
      )}
      <Day4ReminderModal isOpen={killSwitch.showDay4Popup} onDismiss={killSwitch.dismissDay4Popup}
        t={{ day4Title: 'Pagamento em atraso', day4Message: 'O seu sistema será bloqueado amanhã. Efetue o pagamento para evitar a interrupção.', dismiss: 'Entendido' }} />
      <AnimatePresence>
        {showPlatformLogin && (
          <PlatformLoginModal
            onLogin={handlePlatformLogin}
            onClose={() => setShowPlatformLogin(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{notification && <Toast message={notification} onClose={() => setNotification(null)} />}</AnimatePresence>
    </>
  );

  // ─── Route: platform admin bypass (no store required) ─────────
  if (platformAuth.isPlatformAdmin && activeModule === 'platform') {
    return (
      <>
        {persistentOverlays}
        <Suspense fallback={null}>
          <PlatformModule
            adminName={platformAuth.platformName ?? 'Operador'}
            onLogout={handlePlatformLogout}
          />
        </Suspense>
      </>
    );
  }

  // ─── Route: onboarding ─────────────────────────────────────────
  if (!config) {
    return (<>{persistentOverlays}<AnimatePresence><OnboardingScreen onComplete={saveConfig} onPlatformAccess={() => setShowPlatformLogin(true)} /></AnimatePresence></>);
  }

  // ─── Route: cashier login ──────────────────────────────────────
  if (!auth.currentUser) {
    return (<>{persistentOverlays}
      <CashierLoginScreen cashiers={auth.cashiers} storeName={config.storeName}
        onLoginCashier={auth.loginCashier} onLoginAdmin={auth.loginStoreAdmin} /></>);
  }

  // ─── Route: main app ──────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      {persistentOverlays}

      <AnimatePresence>
        {lockedTarget && (
          <AdminLoginModal targetModule={lockedTarget} onAttempt={auth.verifyAdminPin}
            onSuccess={() => { setActiveModule(lockedTarget); setLockedTarget(null); }}
            onClose={() => setLockedTarget(null)} />
        )}
      </AnimatePresence>

      {/* Feature modals */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {showReturns && (
            <ReturnsModal sales={sales} onProcess={handleProcessReturn} onNotify={notify}
              onClose={() => setShowReturns(false)}
              currentUserId={auth.currentUser.id} currentUserName={auth.currentUser.name} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showReconciliation && (
            <CashReconciliationModal sales={sales} onSave={handleSaveReconciliation}
              onNotify={notify} onClose={() => setShowReconciliation(false)}
              cashierName={auth.currentUser.name} shiftStartMs={shiftStartMs} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showBulkImport && (
            <BulkImportModal onImport={handleBulkImport} onNotify={notify}
              onClose={() => setShowBulkImport(false)} />
          )}
        </AnimatePresence>
      </Suspense>

      {killSwitch.state === 'gracePeriod' && killSwitch.daysUntilLock >= 1 && (
        <GracePeriodBanner daysUntilLock={killSwitch.daysUntilLock} t={{ daysUntilBlock: 'dias para o bloqueio' }} />
      )}

      <TitleBar active={activeModule} backendOnline={backendOnline} storeName={config.storeName}
        pendingOps={pendingOps} userName={auth.currentUser.name} />

      <div className={cn('flex flex-1 min-h-0', killSwitch.state === 'gracePeriod' && 'pt-10')}>
        <Sidebar active={activeModule} onChange={setActiveModule} canAccess={auth.canAccess}
          isAdmin={auth.isAdmin} onLock={auth.logout} onCashierLogout={auth.logout}
          isPlatformAdmin={platformAuth.isPlatformAdmin}
          onPlatformClick={() => {
            if (platformAuth.isPlatformAdmin) setActiveModule('platform');
            else setShowPlatformLogin(true);
          }} />

        <AnimatePresence mode="wait">
          <motion.div key={activeModule}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Suspense fallback={<ModuleLoader />}>
              <ErrorBoundary>
              {activeModule === 'pos' && (
                <POSModule products={products}
                  sales={sales} saleNo={saleNo} onSaleComplete={recordSale}
                  onNotify={notify} onAddProduct={saveProduct}
                  currentUserId={auth.currentUser.id} currentUserName={auth.currentUser.name}
                  storeName={config.storeName}
                  onOpenReturns={() => setShowReturns(true)}
                  onOpenReconciliation={() => setShowReconciliation(true)}
                  t={{}} />
              )}
              {activeModule === 'inventory' && (
                <ErrorBoundary fallbackLabel="Erro no Inventário">
                  <InventoryModule products={products} onSaveProduct={saveProduct}
                    onUpdateStock={updateStock} onNotify={notify}
                    onBulkImport={() => setShowBulkImport(true)} />
                </ErrorBoundary>
              )}
              {activeModule === 'reports' && (
                <ErrorBoundary fallbackLabel="Erro nos Relatórios">
                  <ReportsModule products={products} sales={sales} onNotify={notify} />
                </ErrorBoundary>
              )}
              {activeModule === 'security' && (
                <ErrorBoundary fallbackLabel="Erro nas Definições">
                  <SecurityModule config={config} clearConfig={clearConfig}
                    onChangePIN={auth.changePIN}
                    onUpdateStoreInfo={handleUpdateStoreInfo}
                    onNotify={notify} />
                </ErrorBoundary>
              )}
              {activeModule === 'team' && (
                <ErrorBoundary fallbackLabel="Erro na Equipa">
                  <TeamModule cashiers={auth.cashiers} onAddCashier={auth.addCashier}
                    onChangePIN={auth.changeCashierPIN} onRemoveCashier={auth.removeCashier}
                    onNotify={notify} />
                </ErrorBoundary>
              )}
              {activeModule === 'platform' && platformAuth.isPlatformAdmin && (
                <ErrorBoundary fallbackLabel="Erro na Plataforma">
                  <PlatformModule
                    adminName={platformAuth.platformName ?? 'Operador'}
                    onLogout={handlePlatformLogout}
                  />
                </ErrorBoundary>
              )}
              </ErrorBoundary>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

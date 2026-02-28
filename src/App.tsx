"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  ChartLineUp, 
  ShieldCheck, 
  WifiHigh, 
  BatteryHigh, 
  Scan, 
  Plus, 
  Minus, 
  X, 
  CheckCircle, 
  WhatsappLogo, 
  DotsThreeVertical,
  CurrencyCircleDollar,
  IdentificationCard,
  WarningCircle,
  ArrowRight,
  CaretRight,
  UserCircle,
  Globe
} from '@phosphor-icons/react';
import { Language, translations } from './i18n';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PaymentModal } from './components/PaymentModal';
import { useKillSwitch } from './hooks/useKillSwitch';
import { KillSwitchOverlay } from './components/KillSwitchOverlay';
import { GracePeriodBanner } from './components/GracePeriodBanner';
import { Day4ReminderModal } from './components/Day4ReminderModal';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Product = {
  id: string;
  name: string;
  price: number;
  unit: 'Unit' | 'Bulk';
  stock: number;
  category: string;
  image?: string;
};

type CartItem = Product & { quantity: number; selectedUnit: 'Unit' | 'Bulk' };

type Customer = {
  id: string;
  name: string;
  phone: string;
  debt: number;
  limit: number;
};

// --- Mock Data ---
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Pão Fresco', price: 12, unit: 'Unit', stock: 150, category: 'Essentials', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400' },
  { id: '2', name: 'Açúcar Refinado 1kg', price: 85, unit: 'Unit', stock: 45, category: 'Essentials', image: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&q=80&w=400' },
  { id: '3', name: 'Ovos de Granja (Doz)', price: 120, unit: 'Unit', stock: 12, category: 'Essentials', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=400' },
  { id: '4', name: 'Cerveja 2M 330ml', price: 65, unit: 'Unit', stock: 24, category: 'Drinks', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&q=80&w=400' },
  { id: '5', name: 'Arroz Longo 5kg', price: 350, unit: 'Unit', stock: 8, category: 'Essentials', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400' },
  { id: '6', name: 'Cigarro (Single)', price: 5, unit: 'Unit', stock: 200, category: 'Tobacco', image: 'https://images.unsplash.com/photo-1527137342181-19aab11a8ee1?auto=format&fit=crop&q=80&w=400' },
  { id: '7', name: 'Óleo de Cozinha 1L', price: 145, unit: 'Unit', stock: 15, category: 'Essentials', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400' },
  { id: '8', name: 'Sabão em Barra', price: 35, unit: 'Unit', stock: 30, category: 'Hygiene', image: 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&q=80&w=400' },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Jose Machava', phone: '+258 84 123 4567', debt: 450, limit: 1000 },
  { id: 'c2', name: 'Maria Sitoe', phone: '+258 82 987 6543', debt: 120, limit: 500 },
  { id: 'c3', name: 'Antonio Langa', phone: '+258 87 555 0199', debt: 850, limit: 1000 },
];

// --- Components ---

const StatusStrip = ({ lang, setLang, t }: { lang: Language, setLang: (l: Language) => void, t: any }) => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-8 py-3 bg-white border-b border-black/[0.05] relative z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[11px] font-semibold tracking-tight text-muted uppercase">{t.status.online}</span>
        </div>
        <div className="h-3 w-[1px] bg-black/10" />
        <div className="flex items-center gap-2 text-muted">
          <WifiHigh size={16} weight="bold" />
          <span className="text-[11px] font-bold">{t.status.stable}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
          className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-black/[0.05] hover:bg-black/5 transition-colors group"
        >
          <Globe size={14} weight="bold" className="text-muted group-hover:text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-ink">{lang}</span>
        </button>
        <div className="h-3 w-[1px] bg-black/10" />
        <div className="flex items-center gap-2 text-muted">
          <BatteryHigh size={18} weight="bold" className="text-success" />
          <span className="text-[11px] font-bold">88%</span>
        </div>
        <div className="h-3 w-[1px] bg-black/10" />
        <span className="text-[11px] font-bold text-ink">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, t }: { activeTab: string, setActiveTab: (t: string) => void, t: any }) => {
  const tabs = [
    { id: 'pos', icon: ShoppingCart, label: t.sidebar.pos },
    { id: 'debt', icon: Users, label: t.sidebar.debt },
    { id: 'inventory', icon: Package, label: t.sidebar.inventory },
    { id: 'reports', icon: ChartLineUp, label: t.sidebar.reports },
    { id: 'security', icon: ShieldCheck, label: t.sidebar.security },
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-20 md:w-24 flex flex-col items-center py-10 bg-surface border-r border-black/[0.05] z-30">
      <div className="flex-1 flex flex-col gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group relative w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300",
              activeTab === tab.id ? "bg-accent text-white shadow-xl shadow-accent/20" : "text-muted hover:bg-black/5 hover:text-ink"
            )}
          >
            <tab.icon size={24} weight={activeTab === tab.id ? "fill" : "bold"} />
            <span className="absolute left-full ml-4 px-3 py-1.5 bg-ink text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Reusable Modal ---
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-black/[0.05] focus:outline-none"
        >
          <div className="p-8 border-b border-black/[0.05] flex justify-between items-center bg-surface/50">
            <h3 className="text-xl font-black text-ink uppercase tracking-tight">{title}</h3>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-black/[0.05] flex items-center justify-center hover:bg-black/5 transition-colors">
              <X size={20} weight="bold" />
            </button>
          </div>
          <div className="p-8">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const POSModule = ({ products, onNotify, t }: { products: Product[], onNotify: (msg: string) => void, t: any }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSTKModalOpen, setIsSTKModalOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, selectedUnit: 'Unit' }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const total = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const iva = total * 0.16;

  const handleCashPayment = () => {
    setIsCashModalOpen(false);
    setReceivedAmount(0);
    setCart([]);
    onNotify(t.pos.saleCompletedCash);
  };

  return (
    <div className="flex-1 h-full flex overflow-hidden">
      {/* Sale Details Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`${t.modals.saleDetails} #8472`}>
        <div className="space-y-6 py-2">
          <div className="flex justify-between items-center p-4 bg-surface rounded-2xl border border-black/[0.03]">
            <span className="text-xs font-bold text-muted uppercase tracking-widest">{t.modals.status}</span>
            <span className="px-3 py-1 bg-success/10 text-success text-[10px] font-black rounded-full uppercase">{t.modals.activeSession}</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-muted">{t.modals.startedAt}</span>
              <span className="text-ink">08:14 AM</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-muted">{t.modals.terminal}</span>
              <span className="text-ink">POS-01 (Main Counter)</span>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsDetailsModalOpen(false);
              onNotify(t.modals.logsExported);
            }}
            className="w-full py-4 bg-white border border-black/[0.05] rounded-2xl font-bold text-sm hover:bg-surface transition-all"
          >
            {t.modals.exportLogs}
          </button>
        </div>
      </Modal>

      {/* Staff Modal */}
      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title={t.modals.staffMgmt}>
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-3">
            {[
              { name: 'Antonio Langa', role: 'Admin', active: true },
              { name: 'Maria Sitoe', role: 'Cashier', active: false },
              { name: 'Jose Machava', role: 'Manager', active: false },
            ].map((staff) => (
              <button 
                key={staff.name}
                onClick={() => {
                  setIsStaffModalOpen(false);
                  onNotify(`${t.modals.switchedTo} ${staff.name}`);
                }}
                className={cn(
                  "p-5 rounded-2xl border flex items-center justify-between transition-all",
                  staff.active ? "bg-accent/5 border-accent/20" : "bg-white border-black/[0.05] hover:bg-surface"
                )}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center font-bold text-muted">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-ink">{staff.name}</p>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{staff.role}</p>
                  </div>
                </div>
                {staff.active && <CheckCircle size={20} weight="fill" className="text-accent" />}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Scanner Modal */}
      <Modal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} title={t.modals.scanner}>
        <div className="space-y-8 py-4">
          <div className="aspect-video bg-ink rounded-3xl relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent animate-pulse" />
            <div className="w-full h-0.5 bg-accent absolute top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(0,102,255,0.8)] animate-bounce" />
            <Scan size={64} weight="thin" className="text-white/20" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-bold text-ink">{t.modals.scannerInstructions}</p>
            <p className="text-xs text-muted font-medium">{t.modals.scannerMeta}</p>
          </div>
          <button 
            onClick={() => {
              const randomProduct = products[Math.floor(Math.random() * products.length)];
              addToCart(randomProduct);
              setIsScannerOpen(false);
              onNotify(`${t.pos.scanned}: ${randomProduct.name}`);
            }}
            className="w-full py-4 bg-ink text-white rounded-2xl font-bold hover:bg-black/80 transition-all"
          >
            {t.modals.simulateScan}
          </button>
        </div>
      </Modal>

      {/* Cash Modal */}
      <Modal isOpen={isCashModalOpen} onClose={() => { setIsCashModalOpen(false); setReceivedAmount(0); }} title={t.modals.cashPayment}>
        <div className="space-y-8 py-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">{t.modals.amountDue}</p>
              <p className="text-3xl font-black text-ink">{(total + iva).toFixed(2)} MT</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest">{t.modals.received}</p>
              <p className="text-3xl font-black text-accent">{receivedAmount.toFixed(2)} MT</p>
            </div>
          </div>

          {receivedAmount > (total + iva) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-success/5 border border-success/20 rounded-[32px] text-center"
            >
              <p className="text-[10px] font-black text-success uppercase tracking-widest mb-1">{t.modals.change}</p>
              <p className="text-4xl font-black text-success">{(receivedAmount - (total + iva)).toFixed(2)} MT</p>
            </motion.div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[50, 100, 200, 500, 1000].map(val => (
              <button 
                key={val} 
                onClick={() => setReceivedAmount(prev => prev + val)}
                className="py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold text-ink hover:bg-black/5 transition-all active:scale-95"
              >
                {val} MT
              </button>
            ))}
            <button 
              onClick={() => setReceivedAmount(total + iva)}
              className="py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold text-ink hover:bg-black/5 transition-all active:scale-95"
            >
              {t.modals.exact}
            </button>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setReceivedAmount(0)}
              className="flex-1 py-5 border border-black/[0.05] text-muted rounded-2xl font-bold hover:bg-black/5 transition-all"
            >
              {t.modals.clear}
            </button>
            <button 
              onClick={handleCashPayment}
              disabled={receivedAmount < (total + iva)}
              className="flex-[2] py-5 bg-success text-white rounded-2xl font-bold text-lg hover:bg-success/90 transition-all shadow-xl shadow-success/20 disabled:opacity-30 disabled:shadow-none"
            >
              {t.modals.completeSale}
            </button>
          </div>
        </div>
      </Modal>

      {/* Left: Product Grid */}
      <div className="flex-1 p-10 overflow-y-auto bg-canvas">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink">{t.pos.title}</h2>
            <p className="text-muted text-sm font-medium">{t.pos.subtitle}</p>
          </div>
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-black/[0.05] rounded-xl text-sm font-bold hover:bg-black/5 transition-colors"
          >
            <Scan size={20} weight="bold" />
            <span>{t.pos.scan}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <motion.button
              key={product.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => addToCart(product)}
              className="group relative bg-white border border-black/[0.05] p-5 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.03] hover:border-accent/20 text-left"
            >
              <div className="aspect-square rounded-2xl mb-4 overflow-hidden bg-surface">
                <img 
                  src={product.image} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={product.name} 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-ink leading-tight">{product.name}</h3>
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider">{product.category}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-ink">{product.price} MT</span>
                  <span className={cn("text-[10px] font-bold", product.stock < 10 ? "text-danger" : "text-muted")}>{t.inventory.inventoryValue}: {product.stock}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                  <Plus size={16} weight="bold" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Right: Cart Panel */}
      <div className="w-[420px] bg-surface border-l border-black/[0.05] flex flex-col shadow-2xl">
        <div className="p-10 border-b border-black/[0.05] bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-extrabold tracking-tight text-ink">{t.pos.currentSale}</h3>
            <button 
              onClick={() => setIsDetailsModalOpen(true)}
              className="px-2 py-1 bg-surface rounded-md text-[10px] font-bold text-muted hover:bg-black/5 transition-colors"
            >
              #8472
            </button>
          </div>
          <button 
            onClick={() => setIsStaffModalOpen(true)}
            className="text-muted text-xs font-medium hover:text-ink transition-colors"
          >
            {t.pos.staff}: Antonio L.
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-6">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <ShoppingCart size={48} weight="thin" />
                <p className="mt-4 text-sm font-bold text-muted">{t.pos.emptyCart}</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-black/[0.05]">
                    <img src={item.image} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-ink leading-tight">{item.name}</h4>
                    <p className="text-xs font-bold text-muted">{item.price} MT × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-black/[0.05] flex items-center justify-center hover:bg-black/5 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-black/[0.05] flex items-center justify-center hover:bg-black/5 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-10 bg-white border-t border-black/[0.05] space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-muted">
              <span>{t.pos.subtotal}</span>
              <span className="text-ink">{total.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-muted">
              <span>{t.pos.iva}</span>
              <span className="text-ink">{iva.toFixed(2)} MT</span>
            </div>
            <div className="pt-4 border-t border-black/[0.05] flex justify-between items-end">
              <span className="font-extrabold text-2xl text-ink">{t.pos.total}</span>
              <span className="font-black text-3xl text-accent">{(total + iva).toFixed(2)} MT</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              disabled={cart.length === 0}
              onClick={() => setIsCashModalOpen(true)}
              className="py-5 bg-surface border border-black/[0.05] rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-black/5 transition-all group disabled:opacity-30"
            >
              <CurrencyCircleDollar size={24} weight="bold" className="text-muted group-hover:text-ink" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted group-hover:text-ink">{t.pos.cash}</span>
            </button>
            <button 
              disabled={cart.length === 0}
              onClick={() => setIsSTKModalOpen(true)}
              className="py-5 bg-accent text-white rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-30"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t.pos.mpesa}</span>
              </div>
              <span className="font-bold text-xs">{t.pos.stkPush}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STK Push Payment Modal */}
      <PaymentModal
        isOpen={isSTKModalOpen}
        onClose={() => setIsSTKModalOpen(false)}
        amount={total + iva}
        onSuccess={() => {
          setIsSTKModalOpen(false);
          setCart([]);
          onNotify(t.pos.saleCompletedMpesa);
        }}
        onSwitchToCash={() => {
          setIsSTKModalOpen(false);
          setIsCashModalOpen(true);
        }}
        t={{
          title: t.pos.stkPushTitle,
          phoneLabel: t.pos.phoneLabel,
          confirm: t.pos.confirm,
          invalidNumber: t.pos.invalidNumber,
          communicating: t.pos.communicating,
          checkPhone: t.pos.checkPhone,
          resend: t.pos.resend,
          paidButNotWorking: t.pos.paidButNotWorking,
          paymentReceived: t.pos.paymentReceived,
          tryAgain: t.pos.tryAgain,
          payCash: t.pos.payCash,
          saldoInsuficiente: 'Saldo Insuficiente',
          pinInvalido: 'PIN Inválido',
          cancelado: 'Cancelado pelo Utilizador',
          tempoExpirado: 'Tempo Expirado',
          vodacom: t.pos.vodacom,
          movitel: t.pos.movitel,
        }}
      />
    </div>
  );
};

const DebtModule = ({ onNotify, t }: { onNotify: (msg: string) => void, t: any }) => {
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-canvas">
      {/* WhatsApp Modal */}
      <Modal isOpen={isWhatsappModalOpen} onClose={() => setIsWhatsappModalOpen(false)} title={t.modals.whatsappReminder}>
        {selectedCustomer && (
          <div className="space-y-8 py-2">
            <div className="p-6 bg-success/5 border border-success/10 rounded-3xl space-y-4">
              <div className="flex items-center gap-3 text-success">
                <WhatsappLogo size={24} weight="fill" />
                <span className="text-xs font-black uppercase tracking-widest">{t.modals.sendingTo}</span>
              </div>
              <p className="text-sm font-medium text-ink leading-relaxed italic">
                "{t.modals.reminderTemplate.replace('{name}', selectedCustomer.name.split(' ')[0]).replace('{amount}', selectedCustomer.debt.toString())}"
              </p>
            </div>
            <button 
              onClick={() => {
                setIsWhatsappModalOpen(false);
                onNotify(t.modals.reminderSent);
              }}
              className="w-full py-5 bg-success text-white rounded-2xl font-bold text-lg hover:bg-success/90 transition-all shadow-xl shadow-success/20 flex items-center justify-center gap-3"
            >
              <WhatsappLogo size={24} weight="bold" />
              <span>{t.modals.sendReminder}</span>
            </button>
          </div>
        )}
      </Modal>
      {/* New Customer Modal */}
      <Modal isOpen={isNewCustomerModalOpen} onClose={() => setIsNewCustomerModalOpen(false)} title={t.modals.newCustomer}>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.modals.fullName}</label>
              <input type="text" placeholder="e.g. Jose Machava" className="w-full px-5 py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.modals.phone}</label>
              <input type="tel" placeholder="+258..." className="w-full px-5 py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.modals.creditLimit}</label>
              <input type="number" placeholder="1000" className="w-full px-5 py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold focus:outline-none focus:border-accent" />
            </div>
          </div>
          <button 
            onClick={() => {
              setIsNewCustomerModalOpen(false);
              onNotify(t.modals.accountCreated);
            }}
            className="w-full py-5 bg-ink text-white rounded-2xl font-bold hover:bg-black/80 transition-all mt-4"
          >
            {t.modals.createAccount}
          </button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={t.modals.processPayment}>
        {selectedCustomer && (
          <div className="space-y-8 py-2">
            <div className="flex items-center gap-4 p-5 bg-surface rounded-3xl border border-black/[0.03]">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-muted border border-black/[0.05]">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-ink">{selectedCustomer.name}</h4>
                <p className="text-xs font-bold text-muted">{t.modals.currentDebt}: {selectedCustomer.debt} MT</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.modals.paymentAmount}</label>
              <input type="number" placeholder={selectedCustomer.debt.toString()} className="w-full px-6 py-5 bg-surface border border-black/[0.05] rounded-2xl text-2xl font-black text-accent focus:outline-none focus:border-accent" />
            </div>
            <button 
              onClick={() => {
                setIsPaymentModalOpen(false);
                onNotify(`${t.modals.paymentProcessed} ${selectedCustomer.name}.`);
              }}
              className="w-full py-5 bg-success text-white rounded-2xl font-bold text-lg hover:bg-success/90 transition-all shadow-xl shadow-success/20"
            >
              {t.modals.confirmPayment}
            </button>
          </div>
        )}
      </Modal>

      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-ink">{t.debt.title}</h2>
          <p className="text-muted font-medium">{t.debt.subtitle}</p>
        </div>
        <button 
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="px-6 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-black/80 transition-colors flex items-center gap-2"
        >
          <Plus size={20} weight="bold" />
          <span>{t.debt.newCustomer}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-black/[0.05] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                <WarningCircle size={22} weight="bold" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{t.debt.totalOutstanding}</span>
            </div>
            <div className="text-4xl font-black text-danger">12,450 MT</div>
            <p className="mt-4 text-xs text-muted font-medium">{t.debt.activeAccounts.replace('{count}', '24')}</p>
          </div>

          <div className="bg-success p-8 rounded-[32px] text-white shadow-xl shadow-success/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCircle size={22} weight="bold" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">{t.debt.recoveredToday}</span>
            </div>
            <div className="text-4xl font-black">1,200 MT</div>
            <p className="mt-4 text-xs text-white/70 font-medium">{t.debt.settledBy.replace('{count}', '2')}</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[32px] border border-black/[0.05] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-black/[0.05] flex justify-between items-center">
            <h3 className="font-bold text-lg text-ink">{t.debt.activeAccountsTitle}</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{t.debt.overLimit.replace('{count}', '3')}</span>
            </div>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {MOCK_CUSTOMERS.map((customer) => (
              <div key={customer.id} className="p-8 flex items-center justify-between hover:bg-surface transition-colors">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center font-bold text-xl text-muted">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-ink">{customer.name}</h4>
                    <p className="text-xs font-bold text-muted">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right space-y-1">
                    <div className={cn(
                      "text-2xl font-black",
                      customer.debt > customer.limit * 0.8 ? "text-danger" : "text-ink"
                    )}>
                      {customer.debt} MT
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{t.debt.balance}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsPaymentModalOpen(true);
                      }}
                      className="w-11 h-11 rounded-xl border border-black/[0.05] flex items-center justify-center hover:bg-ink hover:text-white transition-all"
                    >
                      <CurrencyCircleDollar size={22} />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsWhatsappModalOpen(true);
                      }}
                      className="w-11 h-11 rounded-xl border border-black/[0.05] flex items-center justify-center hover:bg-success hover:text-white transition-all"
                    >
                      <WhatsappLogo size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const InventoryModule = ({ products, onUpdateStock, onNotify, t }: { products: Product[], onUpdateStock: (id: string, newStock: number) => void, onNotify: (msg: string) => void, t: any }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('');
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setTempStock(product.stock.toString());
  };

  const saveStock = (id: string) => {
    const val = parseInt(tempStock);
    if (!isNaN(val)) {
      onUpdateStock(id, val);
      onNotify(t.modals.stockUpdated);
    }
    setEditingId(null);
  };

  return (
    <div className="flex-1 p-10 overflow-y-auto bg-canvas">
      {/* Suppliers Modal */}
      <Modal isOpen={isSuppliersModalOpen} onClose={() => setIsSuppliersModalOpen(false)} title={t.modals.supplierDirectory}>
        <div className="space-y-4 py-2">
          {[
            { name: 'Armazém Central', contact: '+258 84 000 1111', type: 'Wholesale' },
            { name: 'Distribuidora Maputo', contact: '+258 82 222 3333', type: 'Drinks' },
            { name: 'Padaria Nacional', contact: '+258 87 444 5555', type: 'Bakery' },
          ].map((supplier) => (
            <div key={supplier.name} className="p-5 bg-surface rounded-2xl border border-black/[0.03] flex justify-between items-center">
              <div>
                <p className="font-bold text-ink">{supplier.name}</p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{supplier.type}</p>
              </div>
              <button 
                onClick={() => onNotify(`${t.modals.calling} ${supplier.name}...`)}
                className="w-10 h-10 rounded-xl bg-white border border-black/[0.05] flex items-center justify-center text-success hover:bg-success hover:text-white transition-all"
              >
                <WhatsappLogo size={20} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Stock-In Modal */}
      <Modal isOpen={isStockInModalOpen} onClose={() => setIsStockInModalOpen(false)} title={t.modals.bulkStockIn}>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.modals.selectProduct}</label>
              <select className="w-full px-5 py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold focus:outline-none focus:border-accent appearance-none">
                {products.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.inventory.stock}</label>
                <input type="number" placeholder="0" className="w-full px-5 py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold focus:outline-none focus:border-accent" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">{t.modals.costPrice}</label>
                <input type="number" placeholder="0.00" className="w-full px-5 py-4 bg-surface border border-black/[0.05] rounded-2xl font-bold focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsStockInModalOpen(false);
              onNotify(t.modals.stockUpdated);
            }}
            className="w-full py-5 bg-ink text-white rounded-2xl font-bold hover:bg-black/80 transition-all"
          >
            {t.modals.confirmEntry}
          </button>
        </div>
      </Modal>

      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-ink">{t.inventory.title}</h2>
          <p className="text-muted font-medium">{t.inventory.subtitle}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsSuppliersModalOpen(true)}
            className="px-6 py-3 border border-black/[0.05] rounded-2xl font-bold text-sm hover:bg-surface transition-all"
          >
            {t.inventory.suppliers}
          </button>
          <button 
            onClick={() => setIsStockInModalOpen(true)}
            className="px-6 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-black/80 transition-all flex items-center gap-2"
          >
            <Plus size={20} weight="bold" />
            <span>{t.inventory.stockIn}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: t.inventory.totalSkus, value: products.length.toString(), color: 'text-ink' },
          { label: t.inventory.lowStock, value: products.filter(p => p.stock < 20).length.toString(), color: 'text-danger' },
          { label: t.inventory.inventoryValue, value: (products.reduce((acc, p) => acc + (p.price * p.stock), 0) / 1000).toFixed(1) + 'k', color: 'text-ink' },
          { label: t.inventory.turnover, value: '4.2x', color: 'text-success' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-black/[0.05] p-7 rounded-[32px] shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{stat.label}</span>
            <div className={cn("text-3xl font-black mt-2", stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-12">
        <div className="bg-white border border-black/[0.05] rounded-[32px] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-black/[0.05] flex justify-between items-center">
            <h3 className="font-bold text-lg text-ink">{t.inventory.listTitle}</h3>
            <span className="text-xs font-bold text-muted uppercase tracking-widest">{products.length} {t.inventory.items}</span>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {products.map((product) => (
              <div key={product.id} className="p-8 flex items-center justify-between hover:bg-surface transition-colors">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface border border-black/[0.05]">
                    <img src={product.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-ink">{product.name}</h4>
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">{product.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="text-right space-y-1">
                    {editingId === product.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tempStock}
                          onChange={(e) => setTempStock(e.target.value)}
                          className="w-20 px-3 py-2 bg-surface border border-black/[0.1] rounded-xl font-bold text-center focus:outline-none focus:border-accent"
                          autoFocus
                        />
                        <button 
                          onClick={() => saveStock(product.id)}
                          className="w-10 h-10 bg-success text-white rounded-xl flex items-center justify-center hover:bg-success/90"
                        >
                          <CheckCircle size={20} weight="bold" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="w-10 h-10 bg-surface text-muted rounded-xl flex items-center justify-center hover:bg-black/5"
                        >
                          <X size={20} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={cn("text-2xl font-black", product.stock < 20 ? "text-danger" : "text-ink")}>
                          {product.stock}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{t.inventory.currentStock}</div>
                      </>
                    )}
                  </div>
                  {editingId !== product.id && (
                    <button 
                      onClick={() => startEditing(product)}
                      className="px-6 py-2.5 border border-black/[0.05] rounded-xl text-xs font-bold hover:bg-ink hover:text-white transition-all"
                    >
                      {t.inventory.adjust}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Layout ---

export default function App() {
  const [lang, setLang] = useState<Language>('pt');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [notification, setNotification] = useState<string | null>(null);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [showSubscriptionPayment, setShowSubscriptionPayment] = useState(false);
  const [securitySettings, setSecuritySettings] = useState(() => {
    try {
      const stored = localStorage.getItem('lumina_security_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { biometric: !!parsed.biometric, remoteWipe: !!parsed.remoteWipe, autoLock: !!parsed.autoLock };
      }
    } catch {}
    return { biometric: true, remoteWipe: false, autoLock: true };
  });

  const killSwitch = useKillSwitch({
    lockDayOfMonth: 5,
    ownerPhone: '841234567',
    monthName: 'Fevereiro',
    amountMt: 3500,
    deviceId: 'LUM-88',
    supportPhone: '+258 84 XXX XXXX',
  });

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const updateProductStock = (id: string, newStock: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, newStock) } : p));
  };

  return (
    <div className="h-screen flex bg-canvas overflow-hidden">
      {/* Kill Switch: Full-screen overlay when locked */}
      {killSwitch.state === 'locked' && (
        <KillSwitchOverlay
          config={killSwitch.config}
          isVerifying={showSubscriptionPayment}
          onPayNow={() => setShowSubscriptionPayment(true)}
          onCallSupport={() => notify(`${t.killSwitch.callSupport}: ${killSwitch.config.supportPhone}`)}
          onBack={killSwitch.forceUnlockForDemo}
          t={t.killSwitch}
        />
      )}

      {/* Subscription payment (M-Pesa) when paying from Kill Switch */}
      <PaymentModal
        isOpen={showSubscriptionPayment}
        onClose={() => setShowSubscriptionPayment(false)}
        amount={killSwitch.config.amountMt}
        onSuccess={() => {
          killSwitch.paymentSuccess();
          setShowSubscriptionPayment(false);
          notify(t.killSwitch.thankYouReactivated);
        }}
        onSwitchToCash={() => setShowSubscriptionPayment(false)}
        t={{
          title: t.pos.stkPushTitle,
          phoneLabel: t.pos.phoneLabel,
          confirm: t.pos.confirm,
          invalidNumber: t.pos.invalidNumber,
          communicating: t.pos.communicating,
          checkPhone: t.pos.checkPhone,
          resend: t.pos.resend,
          paidButNotWorking: t.pos.paidButNotWorking,
          paymentReceived: t.pos.paymentReceived,
          tryAgain: t.pos.tryAgain,
          payCash: t.pos.payCash,
          saldoInsuficiente: 'Saldo Insuficiente',
          pinInvalido: 'PIN Inválido',
          cancelado: 'Cancelado pelo Utilizador',
          tempoExpirado: 'Tempo Expirado',
          vodacom: t.pos.vodacom,
          movitel: t.pos.movitel,
        }}
      />

      {/* Grace period: banner (day 1–3 before lock) */}
      {killSwitch.state === 'gracePeriod' && killSwitch.daysUntilLock >= 1 && (
        <GracePeriodBanner daysUntilLock={killSwitch.daysUntilLock} t={{ daysUntilBlock: t.killSwitch.daysUntilBlock }} />
      )}

      {/* Day 4: popup reminder (1 day before lock) */}
      <Day4ReminderModal
        isOpen={killSwitch.showDay4Popup}
        onDismiss={killSwitch.dismissDay4Popup}
        t={{ day4Title: t.killSwitch.day4Title, day4Message: t.killSwitch.day4Message, dismiss: t.killSwitch.dismiss }}
      />

      {/* Reports Modal */}
      <Modal isOpen={isReportsModalOpen} onClose={() => setIsReportsModalOpen(false)} title={t.reports.exportTitle}>
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-2 gap-4">
            <button className="p-6 bg-surface border border-black/[0.05] rounded-3xl text-center space-y-2 hover:bg-black/5 transition-all">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto border border-black/[0.05]">
                <ChartLineUp size={20} className="text-accent" />
              </div>
              <p className="text-xs font-bold text-ink">{t.reports.dailySales}</p>
            </button>
            <button className="p-6 bg-surface border border-black/[0.05] rounded-3xl text-center space-y-2 hover:bg-black/5 transition-all">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto border border-black/[0.05]">
                <Users size={20} className="text-danger" />
              </div>
              <p className="text-xs font-bold text-ink">{t.reports.debtLedger}</p>
            </button>
          </div>
          <button 
            onClick={() => {
              setIsReportsModalOpen(false);
              notify(t.reports.generating);
            }}
            className="w-full py-5 bg-ink text-white rounded-2xl font-bold hover:bg-black/80 transition-all"
          >
            {t.reports.generatePdf}
          </button>
        </div>
      </Modal>

      {/* Security Modal */}
      <Modal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} title={t.modals.securitySettings}>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            {[
              { key: 'biometric' as const, label: t.security.biometric },
              { key: 'remoteWipe' as const, label: t.security.remoteWipe },
              { key: 'autoLock' as const, label: t.security.autoLock },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSecuritySettings((s) => ({ ...s, [key]: !s[key] }))}
                className="w-full flex items-center justify-between p-5 bg-surface rounded-2xl border border-black/[0.03] hover:bg-black/[0.03] transition-colors text-left"
              >
                <span className="font-bold text-ink">{label}</span>
                <div className={cn(
                  "w-12 h-6 rounded-full relative transition-colors shrink-0",
                  securitySettings[key] ? "bg-success" : "bg-black/10"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    securitySettings[key] ? "right-1" : "left-1"
                  )} />
                </div>
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              try {
                localStorage.setItem('lumina_security_settings', JSON.stringify(securitySettings));
                notify(t.modals.configSaved);
                setIsSecurityModalOpen(false);
              } catch {
                notify('Erro ao guardar');
              }
            }}
            className="w-full py-4 bg-ink text-white rounded-2xl font-bold hover:bg-black/80 transition-all"
          >
            {t.modals.saveConfig}
          </button>
        </div>
      </Modal>

      {/* Global Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            className="fixed top-8 left-1/2 z-[3000] flex items-center gap-4 px-6 py-4 bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-white/20 min-w-[380px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <CheckCircle size={28} weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-0.5">System Notification</p>
              <p className="text-sm font-bold text-ink tracking-tight">{notification}</p>
            </div>
            <div className="w-1 h-8 bg-black/[0.05] rounded-full mx-2" />
            <button 
              onClick={() => setNotification(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-black/5 transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grace period banner pushes content down via pt-14 on main */}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
      
      <div className="pl-20 md:pl-24 flex-1 flex flex-col min-w-0">
        <StatusStrip lang={lang} setLang={setLang} t={t} />
        
        <main className={cn("flex-1 overflow-hidden", killSwitch.state === 'gracePeriod' && "pt-14")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === 'pos' && <POSModule products={products} onNotify={notify} t={t} />}
              {activeTab === 'debt' && <DebtModule onNotify={notify} t={t} />}
              {activeTab === 'inventory' && <InventoryModule products={products} onUpdateStock={updateProductStock} onNotify={notify} t={t} />}
              {activeTab === 'reports' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-8">
                  <div className="w-20 h-20 bg-surface rounded-[32px] flex items-center justify-center text-muted">
                    <ChartLineUp size={40} weight="bold" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-ink">{t.reports.title}</h2>
                    <p className="text-muted text-sm max-w-xs mx-auto font-medium">
                      {t.reports.subtitle}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsReportsModalOpen(true)}
                      className="px-6 py-3 bg-white border border-black/[0.05] rounded-2xl font-bold text-sm hover:bg-surface transition-all"
                    >
                      {t.reports.exportPdf}
                    </button>
                    <button 
                      onClick={() => notify(t.reports.syncing)}
                      className="px-6 py-3 bg-ink text-white rounded-2xl font-bold text-sm hover:bg-black/80 transition-all"
                    >
                      {t.reports.cloudSync}
                    </button>
                  </div>
                </div>
              )}
              {activeTab === 'security' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-10">
                  <div className="w-20 h-20 bg-ink text-white rounded-[32px] flex items-center justify-center">
                    <ShieldCheck size={40} weight="bold" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-ink">{t.security.title}</h2>
                    <p className="text-muted text-sm max-w-xs mx-auto font-medium">
                      {t.security.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button 
                      onClick={killSwitch.forceLockForDemo}
                      className="w-full py-4 bg-danger text-white rounded-2xl font-bold hover:bg-danger/90 transition-all shadow-lg shadow-danger/20"
                    >
                      {t.security.killSwitch}
                    </button>
                    {killSwitch.state === 'locked' && (
                      <button 
                        onClick={killSwitch.forceUnlockForDemo}
                        className="w-full py-4 bg-success text-white rounded-2xl font-bold text-sm hover:bg-success/90"
                      >
                        Unlock (demo)
                      </button>
                    )}
                    <button 
                      onClick={() => setIsSecurityModalOpen(true)}
                      className="w-full py-4 bg-white border border-black/[0.05] rounded-2xl font-bold text-sm hover:bg-surface transition-all"
                    >
                      {t.security.resetPermissions}
                    </button>
                    <button 
                      onClick={() => setIsSecurityModalOpen(true)}
                      className="w-full py-4 bg-white border border-black/[0.05] rounded-2xl font-bold text-sm hover:bg-surface transition-all"
                    >
                      {t.security.appPinning}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

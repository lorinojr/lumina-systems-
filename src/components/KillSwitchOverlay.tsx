"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Phone, CaretRight, CaretLeft } from '@phosphor-icons/react';
import type { KillSwitchConfig } from '../hooks/useKillSwitch';

interface KillSwitchOverlayProps {
  config: KillSwitchConfig;
  isVerifying?: boolean;
  onPayNow: () => void;
  onCallSupport: () => void;
  onBack?: () => void;
  t: {
    systemBlocked: string;
    paymentPending: string;
    secondaryMessage: string;
    payNowMpesa: string;
    difficulties: string;
    callSupport: string;
    verifying: string;
    thankYouReactivated: string;
    back: string;
  };
}

export function KillSwitchOverlay({ config, isVerifying = false, onPayNow, onCallSupport, onBack, t }: KillSwitchOverlayProps) {
  const [phone, setPhone] = useState(config.ownerPhone);

  return (
    <div className="fixed inset-0 z-[2500] bg-ink flex flex-col items-center justify-center text-center p-6 overflow-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full max-w-md flex flex-col items-center"
      >
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold transition-colors"
          >
            <CaretLeft size={20} weight="bold" />
            {t.back}
          </button>
        )}

        {/* Pulsing Padlock (danger/red - previous style) */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-[28px] bg-danger flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-danger/20"
        >
          <Lock size={64} weight="bold" className="text-white" />
        </motion.div>

        {/* Primary Message */}
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
          {t.systemBlocked}: {t.paymentPending}
        </h1>

        {/* Secondary Context */}
        <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-md mb-10">
          {t.secondaryMessage.replace('{month}', config.monthName).replace('{amount}', config.amountMt.toLocaleString())}
        </p>

        {/* Pre-filled phone */}
        <div className="w-full max-w-sm mb-6">
          <label className="block text-left text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">
            Número do proprietário
          </label>
          <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-4">
            <Phone size={22} weight="bold" className="text-white/70" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent text-white text-lg font-bold placeholder-white/40 focus:outline-none"
              placeholder="84 123 4567"
            />
          </div>
        </div>

        {/* Pay Now Button */}
        <button
          onClick={onPayNow}
          disabled={isVerifying}
          className="w-full max-w-sm py-6 bg-danger hover:bg-danger/90 disabled:opacity-70 text-white font-black text-lg uppercase tracking-wider rounded-2xl shadow-xl shadow-danger/20 flex items-center justify-center gap-3 transition-all mb-8"
        >
          {isVerifying ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
              />
              {t.verifying}
            </>
          ) : (
            <>
              {t.payNowMpesa}
              <CaretRight size={24} weight="bold" />
            </>
          )}
        </button>

        {/* Support Footer */}
        <p className="text-white/50 text-xs font-medium mb-2">
          {t.difficulties}{' '}
          <a
            href={`tel:${config.supportPhone.replace(/\s/g, '')}`}
            onClick={() => onCallSupport()}
            className="underline hover:text-white/90 transition-colors"
          >
            {t.callSupport}: {config.supportPhone}
          </a>
        </p>
        <p className="text-white/30 text-[10px] font-mono tracking-wider">
          Device ID: {config.deviceId}
        </p>
      </motion.div>
    </div>
  );
}

export function KillSwitchOverlayVerifying({ t }: { t: { verifying: string } }) {
  return (
    <div className="fixed inset-0 z-[2500] bg-ink flex flex-col items-center justify-center text-center p-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 border-4 border-danger/30 border-t-danger rounded-full mb-6"
      />
      <p className="text-white text-lg font-bold">{t.verifying}</p>
    </div>
  );
}

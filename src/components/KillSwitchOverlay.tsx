"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Phone } from '@phosphor-icons/react';
import type { KillSwitchConfig } from '../hooks/useKillSwitch';

interface KillSwitchOverlayProps {
  config:         KillSwitchConfig;
  onCallSupport:  () => void;
}

export function KillSwitchOverlay({ config, onCallSupport }: KillSwitchOverlayProps) {
  return (
    <div className="fixed inset-0 z-[2500] bg-ink flex flex-col items-center justify-center text-center p-6 overflow-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full max-w-md flex flex-col items-center"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-[28px] bg-danger flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-danger/20"
        >
          <Lock size={64} weight="bold" className="text-white" />
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
          Sistema Bloqueado
        </h1>

        <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-md mb-10">
          A sua subscrição de {config.monthName} está em atraso. Entre em contacto com o suporte
          Vela para efectuar o pagamento e reactivar o sistema.
        </p>

        <a
          href={`tel:${config.supportPhone.replace(/\s/g, '')}`}
          onClick={onCallSupport}
          className="w-full max-w-sm py-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-base uppercase tracking-wider rounded-2xl flex items-center justify-center gap-3 transition-all mb-6"
        >
          <Phone size={22} weight="bold" />
          Ligar ao Suporte: {config.supportPhone}
        </a>

        <p className="text-white/30 text-[10px] font-mono tracking-wider">
          Device: {config.deviceId}
        </p>
      </motion.div>
    </div>
  );
}

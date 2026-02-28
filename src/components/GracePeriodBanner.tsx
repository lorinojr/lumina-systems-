"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Warning } from '@phosphor-icons/react';

interface GracePeriodBannerProps {
  daysUntilLock: number;
  t: { daysUntilBlock: string };
}

export function GracePeriodBanner({ daysUntilLock, t }: GracePeriodBannerProps) {
  const message =
    daysUntilLock === 1
      ? '1 dia para o bloqueio'
      : `${daysUntilLock} dias para o bloqueio`;

  return (
    <motion.div
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[2000] bg-[#EAB308] text-[#1a1a1a] py-3 px-6 shadow-lg"
    >
      <div className="flex items-center justify-center gap-3">
        <Warning size={22} weight="bold" />
        <span className="font-black text-sm uppercase tracking-wide">
          {message}
        </span>
      </div>
    </motion.div>
  );
}

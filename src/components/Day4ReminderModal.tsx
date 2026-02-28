"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Warning } from '@phosphor-icons/react';

interface Day4ReminderModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  t: { day4Title: string; day4Message: string; dismiss: string };
}

export function Day4ReminderModal({ isOpen, onDismiss, t }: Day4ReminderModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 z-[2400] bg-ink/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2401] w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-black/[0.05] overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#EAB308] flex items-center justify-center">
                  <Warning size={28} weight="bold" className="text-[#1a1a1a]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-ink uppercase tracking-tight">
                    {t.day4Title}
                  </h3>
                  <p className="text-muted text-sm font-medium mt-1">
                    {t.day4Message}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onDismiss}
                  className="flex-1 py-4 bg-ink text-white rounded-2xl font-bold hover:bg-ink/90 transition-colors"
                >
                  {t.dismiss}
                </button>
                <button
                  onClick={onDismiss}
                  className="w-12 h-12 rounded-2xl border border-black/[0.1] flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <X size={22} weight="bold" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

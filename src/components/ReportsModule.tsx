"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
  CaretRight, DownloadSimple, CalendarBlank,
  Clock, ArrowLeft,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product, Sale } from '../types';

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

function fmtMt(n: number) {
  return n.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MT';
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString('pt', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DOW_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

type DrillLevel = 'years' | 'months' | 'weeks' | 'days' | 'hours';
interface DrillState {
  level: DrillLevel;
  year?: number;
  month?: number;   // 0-indexed
  weekStart?: Date;
  day?: Date;
}

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'all';
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today',     label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'thisWeek',  label: 'Esta Semana' },
  { key: 'thisMonth', label: 'Este Mês' },
  { key: 'thisYear',  label: 'Este Ano' },
  { key: 'all',       label: 'Tudo' },
];

interface ReportsModuleProps {
  products: Product[];
  sales:    Sale[];
  onNotify: (msg: string) => void;
}

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const diff = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfWeek(d: Date): Date {
  const r = startOfWeek(d);
  r.setDate(r.getDate() + 7);
  return r;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

function presetToDrill(key: PresetKey, today: Date): DrillState {
  switch (key) {
    case 'today': {
      const d = startOfDay(today);
      return { level: 'hours', day: d, year: d.getFullYear(), month: d.getMonth(), weekStart: startOfWeek(d) };
    }
    case 'yesterday': {
      const d = startOfDay(today); d.setDate(d.getDate() - 1);
      return { level: 'hours', day: d, year: d.getFullYear(), month: d.getMonth(), weekStart: startOfWeek(d) };
    }
    case 'thisWeek': {
      const ws = startOfWeek(today);
      return { level: 'days', weekStart: ws, year: ws.getFullYear(), month: ws.getMonth() };
    }
    case 'thisMonth':
      return { level: 'weeks', year: today.getFullYear(), month: today.getMonth() };
    case 'thisYear':
      return { level: 'months', year: today.getFullYear() };
    case 'all':
      return { level: 'years' };
  }
}

function matchPreset(drill: DrillState, today: Date): PresetKey | null {
  if (drill.level === 'years' && drill.year === undefined) return 'all';
  if (drill.level === 'months' && drill.year === today.getFullYear() && drill.month === undefined) return 'thisYear';
  if (drill.level === 'weeks' && drill.year === today.getFullYear() && drill.month === today.getMonth()) return 'thisMonth';
  if (drill.level === 'days' && drill.weekStart && sameDay(drill.weekStart, startOfWeek(today))) return 'thisWeek';
  if (drill.level === 'hours' && drill.day) {
    if (sameDay(drill.day, today)) return 'today';
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (sameDay(drill.day, y)) return 'yesterday';
  }
  return null;
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsModule({ products, sales, onNotify }: ReportsModuleProps) {
  // Stable "today" for the lifetime of this mount — keeps preset matching stable
  // and avoids re-deriving every render.
  const today = useMemo(() => startOfDay(new Date()), []);
  const [drill, setDrill] = useState<DrillState>(() => presetToDrill('today', today));
  const activePreset = matchPreset(drill, today);
  const applyPreset = useCallback((key: PresetKey) => setDrill(presetToDrill(key, today)), [today]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = s.timestamp;
      if (drill.year !== undefined && d.getFullYear() !== drill.year) return false;
      if (drill.month !== undefined && d.getMonth() !== drill.month) return false;
      if (drill.weekStart) {
        const ws = drill.weekStart.getTime();
        const we = endOfWeek(drill.weekStart).getTime();
        if (d.getTime() < ws || d.getTime() >= we) return false;
      }
      if (drill.day) {
        if (d.getFullYear() !== drill.day.getFullYear() || d.getMonth() !== drill.day.getMonth() || d.getDate() !== drill.day.getDate()) return false;
      }
      return true;
    });
  }, [sales, drill]);

  const totalRevenue = filteredSales.reduce((s, x) => s + x.total, 0);
  const totalTx = filteredSales.length;
  const avgTicket = totalTx ? totalRevenue / totalTx : 0;
  const cashTotal  = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
  const mpesaTotal = filteredSales.filter(s => s.paymentMethod === 'mpesa').reduce((s, x) => s + x.total, 0);
  const emolaTotal = filteredSales.filter(s => s.paymentMethod === 'emola').reduce((s, x) => s + x.total, 0);

  // ── Group data for current drill level ──────────────────────
  const groups = useMemo(() => {
    if (drill.level === 'years') {
      const byYear = new Map<number, Sale[]>();
      sales.forEach(s => {
        const y = s.timestamp.getFullYear();
        if (!byYear.has(y)) byYear.set(y, []);
        byYear.get(y)!.push(s);
      });
      return Array.from(byYear.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([year, ss]) => ({
          key: String(year), label: String(year),
          revenue: ss.reduce((s, x) => s + x.total, 0),
          txCount: ss.length,
          onClick: () => setDrill({ level: 'months', year }),
        }));
    }

    if (drill.level === 'months' && drill.year !== undefined) {
      const byMonth = new Map<number, Sale[]>();
      filteredSales.forEach(s => {
        const m = s.timestamp.getMonth();
        if (!byMonth.has(m)) byMonth.set(m, []);
        byMonth.get(m)!.push(s);
      });
      return Array.from(byMonth.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, ss]) => ({
          key: String(month), label: MONTH_NAMES[month],
          revenue: ss.reduce((s, x) => s + x.total, 0),
          txCount: ss.length,
          onClick: () => setDrill({ level: 'weeks', year: drill.year, month }),
        }));
    }

    if (drill.level === 'weeks' && drill.year !== undefined && drill.month !== undefined) {
      const byWeek = new Map<string, { start: Date; sales: Sale[] }>();
      filteredSales.forEach(s => {
        const ws = startOfWeek(s.timestamp);
        const key = ws.toISOString();
        if (!byWeek.has(key)) byWeek.set(key, { start: ws, sales: [] });
        byWeek.get(key)!.sales.push(s);
      });
      return Array.from(byWeek.values())
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .map(({ start, sales: ss }) => {
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          const sameMonth = start.getMonth() === end.getMonth();
          const label = sameMonth
            ? `${start.getDate()}–${end.getDate()} ${MONTH_SHORT[start.getMonth()]}`
            : `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`;
          return {
            key: start.toISOString(),
            label: `Semana de ${label}`,
            revenue: ss.reduce((s, x) => s + x.total, 0),
            txCount: ss.length,
            onClick: () => setDrill({ level: 'days', year: drill.year, month: drill.month, weekStart: start }),
          };
        });
    }

    if (drill.level === 'days' && drill.weekStart) {
      const byDay = new Map<string, { date: Date; sales: Sale[] }>();
      filteredSales.forEach(s => {
        const d = new Date(s.timestamp);
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString();
        if (!byDay.has(key)) byDay.set(key, { date: d, sales: [] });
        byDay.get(key)!.sales.push(s);
      });
      return Array.from(byDay.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ date, sales: ss }) => {
          const isToday = sameDay(date, today);
          const y = new Date(today); y.setDate(y.getDate() - 1);
          const isYesterday = sameDay(date, y);
          const dateLabel = `${DOW_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
          const label = isToday ? `Hoje · ${dateLabel}` : isYesterday ? `Ontem · ${dateLabel}` : dateLabel;
          return {
            key: date.toISOString(),
            label,
            revenue: ss.reduce((s, x) => s + x.total, 0),
            txCount: ss.length,
            onClick: () => setDrill({ ...drill, level: 'hours', day: date }),
          };
        });
    }

    if (drill.level === 'hours' && drill.day) {
      const byHour = new Map<number, Sale[]>();
      filteredSales.forEach(s => {
        const h = s.timestamp.getHours();
        if (!byHour.has(h)) byHour.set(h, []);
        byHour.get(h)!.push(s);
      });
      return Array.from(byHour.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([hour, ss]) => ({
          key: String(hour),
          label: `${String(hour).padStart(2, '0')}:00 – ${String(hour).padStart(2, '0')}:59`,
          revenue: ss.reduce((s, x) => s + x.total, 0),
          txCount: ss.length,
          onClick: undefined,
        }));
    }

    return [];
  }, [drill, sales, filteredSales]);

  // ── Breadcrumb ──────────────────────────────────────────────
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; onClick?: () => void }[] = [];
    crumbs.push({ label: 'Tudo', onClick: () => setDrill({ level: 'years' }) });
    if (drill.year !== undefined) {
      crumbs.push({ label: String(drill.year), onClick: () => setDrill({ level: 'months', year: drill.year }) });
    }
    if (drill.month !== undefined) {
      crumbs.push({ label: MONTH_NAMES[drill.month], onClick: () => setDrill({ level: 'weeks', year: drill.year, month: drill.month }) });
    }
    if (drill.weekStart) {
      const ws = drill.weekStart;
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      const sameMonth = ws.getMonth() === we.getMonth();
      const wLabel = sameMonth
        ? `${ws.getDate()}–${we.getDate()} ${MONTH_SHORT[ws.getMonth()]}`
        : `${ws.getDate()} ${MONTH_SHORT[ws.getMonth()]} – ${we.getDate()} ${MONTH_SHORT[we.getMonth()]}`;
      crumbs.push({
        label: wLabel,
        onClick: () => setDrill({ level: 'days', year: drill.year, month: drill.month, weekStart: drill.weekStart }),
      });
    }
    if (drill.day) {
      const isToday = sameDay(drill.day, today);
      const y = new Date(today); y.setDate(y.getDate() - 1);
      const isYesterday = sameDay(drill.day, y);
      crumbs.push({
        label: isToday ? 'Hoje' : isYesterday ? 'Ontem'
          : `${DOW_SHORT[drill.day.getDay()]} ${drill.day.getDate()} ${MONTH_SHORT[drill.day.getMonth()]}`,
      });
    }
    return crumbs;
  }, [drill, today]);

  const goBack = useCallback(() => {
    if (drill.level === 'hours') setDrill({ level: 'days', year: drill.year, month: drill.month, weekStart: drill.weekStart });
    else if (drill.level === 'days') setDrill({ level: 'weeks', year: drill.year, month: drill.month });
    else if (drill.level === 'weeks') setDrill({ level: 'months', year: drill.year });
    else if (drill.level === 'months') setDrill({ level: 'years' });
  }, [drill]);

  // ── CSV export ──────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (drill.level === 'hours' && filteredSales.length > 0) {
      const header = ['Venda #', 'Hora', 'Artigos', 'Total', 'Método', 'Operador'];
      const rows = filteredSales.map(s => [
        String(s.number), fmtTime(s.timestamp),
        String(s.items.reduce((a, i) => a + i.quantity, 0)),
        s.total.toFixed(2),
        s.paymentMethod === 'mpesa' ? 'M-Pesa' : s.paymentMethod === 'emola' ? 'Emola' : 'Dinheiro',
        s.cashierName ?? '',
      ]);
      exportCSV([header, ...rows], `vendas_${drill.day?.toISOString().slice(0, 10)}.csv`);
    } else {
      const header = ['Período', 'Transacções', 'Receita (MT)'];
      const rows = groups.map(g => [g.label, String(g.txCount), g.revenue.toFixed(2)]);
      exportCSV([header, ...rows], `relatorio_${drill.level}.csv`);
    }
    onNotify('CSV exportado.');
  }, [drill, filteredSales, groups, onNotify]);

  const maxRev = Math.max(...groups.map(g => g.revenue), 1);
  const levelLabel: Record<DrillLevel, string> = {
    years: 'Anos', months: 'Meses', weeks: 'Semanas', days: 'Dias', hours: 'Horas',
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-canvas">
      {/* Header */}
      <div className="px-6 py-3 bg-canvas border-b border-black/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {drill.level !== 'years' && (
            <button onClick={goBack} aria-label="Voltar"
              className="w-11 h-11 -ml-2 rounded-lg flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors">
              <ArrowLeft size={18} weight="bold" className="text-muted" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black tracking-tight text-ink">Relatórios</h2>
            <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
              {breadcrumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <CaretRight size={9} weight="bold" className="text-black/20" />}
                  {c.onClick && i < breadcrumbs.length - 1
                    ? <button onClick={c.onClick} className="hover:text-accent transition-colors">{c.label}</button>
                    : <span className="text-ink font-bold">{c.label}</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleExportCSV}
          className="flex items-center gap-1.5 h-10 px-4 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20">
          <DownloadSimple size={14} weight="bold" />Exportar CSV
        </button>
      </div>

      {/* Preset chips — the everyday timeframes. Breadcrumb above stays for power use. */}
      <div className="px-6 py-3 bg-canvas border-b border-black/[0.06] shrink-0 flex items-center gap-2 flex-wrap">
        {PRESETS.map(p => {
          const active = activePreset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              aria-pressed={active}
              className={cn(
                'h-9 px-3.5 rounded-full text-[12px] font-bold transition-colors',
                active
                  ? 'bg-accent text-white shadow-sm shadow-accent/20'
                  : 'bg-surface text-muted hover:text-ink hover:bg-black/[0.05]',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Stats — numbers-first, no decorative icons. Receita gets primary weight. */}
      <div className="px-6 py-4 bg-canvas border-b border-black/[0.06] shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4 items-end">
          {/* Primary: Receita Total spans visually larger */}
          <div className="col-span-1">
            <div className="text-[9px] font-black text-muted uppercase tracking-[0.14em] mb-1">Receita Total</div>
            <div className="text-[28px] font-black text-ink leading-none num">
              {totalRevenue.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-[14px] ml-1 text-muted font-bold">MT</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black text-muted uppercase tracking-[0.14em] mb-1">Transacções</div>
            <div className="text-[22px] font-black text-ink leading-none num">{totalTx}</div>
            {totalTx > 0 && (
              <div className="text-[10px] text-muted font-semibold mt-1 num">média {avgTicket.toFixed(0)} MT</div>
            )}
          </div>
          <div>
            <div className="text-[9px] font-black text-muted uppercase tracking-[0.14em] mb-1">Dinheiro</div>
            <div className="text-[22px] font-black text-ink leading-none num">
              {cashTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-[12px] ml-1 text-muted font-bold">MT</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black text-mpesa uppercase tracking-[0.14em] mb-1">M-Pesa</div>
            <div className="text-[22px] font-black text-mpesa leading-none num">
              {mpesaTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-[12px] ml-1 text-mpesa/70 font-bold">MT</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black text-emola uppercase tracking-[0.14em] mb-1">Emola</div>
            <div className="text-[22px] font-black text-emola leading-none num">
              {emolaTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-[12px] ml-1 text-emola/70 font-bold">MT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down list */}
      <div className="flex-1 overflow-auto p-5">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <CalendarBlank size={40} weight="thin" className="mb-3 opacity-25" />
            <p className="text-sm font-semibold opacity-40">Sem dados para este período</p>
          </div>
        ) : drill.level === 'hours' ? (
          /* At hours level, show individual transactions */
          <div className="space-y-2">
            {groups.map(g => (
              <div key={g.key} className="bg-canvas rounded-xl border border-black/[0.06] overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <Clock size={14} weight="bold" className="text-accent" />
                    <span className="text-[13px] font-black text-ink num">{g.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-muted num">{g.txCount} venda{g.txCount !== 1 ? 's' : ''}</span>
                    <span className="font-black text-accent num">{fmtMt(g.revenue)}</span>
                  </div>
                </div>
                <table className="w-full text-left">
                  <tbody className="divide-y divide-black/[0.04]">
                    {filteredSales
                      .filter(s => s.timestamp.getHours() === parseInt(g.key))
                      .map(sale => (
                        <tr key={sale.id} className="hover:bg-surface/50">
                          <td className="py-2 px-4 font-mono text-[12px] font-bold text-ink num">#{String(sale.number).padStart(4, '0')}</td>
                          <td className="py-2 px-4 font-mono text-[11px] text-muted num">{fmtTime(sale.timestamp)}</td>
                          <td className="py-2 px-4 text-[11px] text-muted num">{sale.items.reduce((s, i) => s + i.quantity, 0)} art.</td>
                          <td className="py-2 px-4 text-right text-[13px] font-black text-ink num">{fmtMt(sale.total)}</td>
                          <td className="py-2 px-4 text-center">
                            <span className={cn('text-[10px] font-black px-2 py-0.5 rounded uppercase',
                              sale.paymentMethod === 'mpesa' ? 'bg-mpesa/10 text-mpesa' :
                              sale.paymentMethod === 'emola' ? 'bg-emola/12 text-emola' :
                                                               'bg-success/10 text-success')}>
                              {sale.paymentMethod === 'mpesa' ? 'M-Pesa' :
                               sale.paymentMethod === 'emola' ? 'Emola' : 'Cash'}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-[11px] text-muted">{sale.cashierName ?? '—'}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          /* For other levels, show group cards */
          <div className="space-y-2">
            {groups.map(g => (
              <button key={g.key} onClick={g.onClick} disabled={!g.onClick}
                className={cn(
                  'w-full bg-canvas rounded-xl border border-black/[0.06] p-4 flex items-center gap-4 transition-all text-left min-h-[64px]',
                  g.onClick ? 'hover:border-accent/30 hover:shadow-sm cursor-pointer' : 'cursor-default',
                )}>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-black text-ink">{g.label}</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5 num">
                    {g.txCount} transacç{g.txCount !== 1 ? 'ões' : 'ão'}
                  </div>
                </div>
                <div className="hidden sm:block w-32 lg:w-48 xl:w-64 shrink-0">
                  <div className="h-2 bg-black/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(g.revenue / maxRev) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0 w-28 lg:w-36">
                  <div className="text-[17px] lg:text-[20px] font-black text-ink num">{fmtMt(g.revenue)}</div>
                </div>
                {g.onClick && <CaretRight size={14} weight="bold" className="text-muted shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

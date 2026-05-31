"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
  CaretRight, DownloadSimple, CalendarBlank,
  CurrencyCircleDollar, Receipt, Clock, ArrowLeft,
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
const DOW_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

type DrillLevel = 'years' | 'months' | 'weeks' | 'days' | 'hours';
interface DrillState {
  level: DrillLevel;
  year?: number;
  month?: number;   // 0-indexed
  weekStart?: Date;
  day?: Date;
}

interface ReportsModuleProps {
  products: Product[];
  sales:    Sale[];
  onNotify: (msg: string) => void;
}

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
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
  const [drill, setDrill] = useState<DrillState>({ level: 'years' });

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
  const cashTotal = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
  const mpesaTotal = filteredSales.filter(s => s.paymentMethod === 'mpesa').reduce((s, x) => s + x.total, 0);

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
          return {
            key: start.toISOString(),
            label: `Semana ${getWeekNumber(start)} (${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1})`,
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
        .map(({ date, sales: ss }) => ({
          key: date.toISOString(),
          label: `${DOW_SHORT[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
          revenue: ss.reduce((s, x) => s + x.total, 0),
          txCount: ss.length,
          onClick: () => setDrill({ ...drill, level: 'hours', day: date }),
        }));
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
    crumbs.push({ label: 'Todos os Anos', onClick: () => setDrill({ level: 'years' }) });
    if (drill.year !== undefined) {
      crumbs.push({ label: String(drill.year), onClick: () => setDrill({ level: 'months', year: drill.year }) });
    }
    if (drill.month !== undefined) {
      crumbs.push({ label: MONTH_NAMES[drill.month], onClick: () => setDrill({ level: 'weeks', year: drill.year, month: drill.month }) });
    }
    if (drill.weekStart) {
      crumbs.push({
        label: `Semana ${getWeekNumber(drill.weekStart)}`,
        onClick: () => setDrill({ level: 'days', year: drill.year, month: drill.month, weekStart: drill.weekStart }),
      });
    }
    if (drill.day) {
      crumbs.push({ label: `${drill.day.getDate()}/${drill.day.getMonth() + 1}` });
    }
    return crumbs;
  }, [drill]);

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
        s.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Dinheiro',
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
      <div className="px-6 py-3 bg-white border-b border-black/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {drill.level !== 'years' && (
            <button onClick={goBack} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
              <ArrowLeft size={14} weight="bold" className="text-muted" />
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20">
          <DownloadSimple size={13} weight="bold" />Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="px-6 py-3 bg-white border-b border-black/[0.06] shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: CurrencyCircleDollar, label: 'Receita Total', value: fmtMt(totalRevenue), color: 'text-accent', bg: 'bg-accent/8' },
            { icon: Receipt, label: 'Transacções', value: String(totalTx), color: 'text-success', bg: 'bg-success/8' },
            { icon: CurrencyCircleDollar, label: 'Dinheiro', value: fmtMt(cashTotal), color: 'text-ink', bg: 'bg-black/[0.04]' },
            { icon: CurrencyCircleDollar, label: 'M-Pesa', value: fmtMt(mpesaTotal), color: 'text-accent', bg: 'bg-accent/8' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                <s.icon size={15} weight="bold" className={s.color} />
              </div>
              <div>
                <div className="text-[9px] font-black text-muted uppercase tracking-wider">{s.label}</div>
                <div className="text-[15px] font-black text-ink leading-tight">{s.value}</div>
              </div>
            </div>
          ))}
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
              <div key={g.key} className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <Clock size={14} weight="bold" className="text-accent" />
                    <span className="text-[13px] font-black text-ink">{g.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-muted">{g.txCount} venda{g.txCount !== 1 ? 's' : ''}</span>
                    <span className="font-black text-accent">{fmtMt(g.revenue)}</span>
                  </div>
                </div>
                <table className="w-full text-left">
                  <tbody className="divide-y divide-black/[0.04]">
                    {filteredSales
                      .filter(s => s.timestamp.getHours() === parseInt(g.key))
                      .map(sale => (
                        <tr key={sale.id} className="hover:bg-surface/50">
                          <td className="py-2 px-4 font-mono text-[12px] font-bold text-ink">#{String(sale.number).padStart(4, '0')}</td>
                          <td className="py-2 px-4 font-mono text-[11px] text-muted">{fmtTime(sale.timestamp)}</td>
                          <td className="py-2 px-4 text-[11px] text-muted">{sale.items.reduce((s, i) => s + i.quantity, 0)} art.</td>
                          <td className="py-2 px-4 text-right text-[13px] font-black text-ink">{fmtMt(sale.total)}</td>
                          <td className="py-2 px-4 text-center">
                            <span className={cn('text-[10px] font-black px-2 py-0.5 rounded uppercase',
                              sale.paymentMethod === 'mpesa' ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success')}>
                              {sale.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}
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
                  'w-full bg-white rounded-xl border border-black/[0.06] p-4 flex items-center gap-4 transition-all text-left',
                  g.onClick ? 'hover:border-accent/30 hover:shadow-sm cursor-pointer' : 'cursor-default',
                )}>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-black text-ink">{g.label}</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">
                    {g.txCount} transacç{g.txCount !== 1 ? 'ões' : 'ão'}
                  </div>
                </div>
                <div className="w-48 shrink-0">
                  <div className="h-2 bg-black/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(g.revenue / maxRev) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0 w-36">
                  <div className="text-[15px] font-black text-ink tabular-nums">{fmtMt(g.revenue)}</div>
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

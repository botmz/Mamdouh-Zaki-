import React, { useState } from 'react';
import {
  Send,
  Play,
  Pause,
  RefreshCw,
  LogOut,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react';
import { SystemStats, PriceRecord } from '../types';

interface HeaderProps {
  stats: SystemStats | null;
  onControlEngine: (action: 'start' | 'pause') => void;
  onUpdatePrices: () => void;
  onBroadcastStatic: () => void;
  onLogout: () => void;
  username: string;
  isUpdatingPrices: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onControlEngine,
  onUpdatePrices,
  onBroadcastStatic,
  onLogout,
  username,
  isUpdatingPrices,
}) => {
  const isRunning = stats?.engineStatus === 'running';
  const gold = stats?.lastGoldPrice;
  const btc = stats?.lastBtcPrice;

  const renderTrend = (record?: PriceRecord) => {
    if (!record) return <Minus className="w-3.5 h-3.5 text-slate-500" />;
    if (record.direction === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (record.direction === 'down') return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Top Live Markets Ticker Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800/60 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5 font-medium text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              الأسعار المباشرة:
            </span>

            {/* Gold Live */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-amber-400 font-semibold">⚡ الذهب XAU/USD</span>
              <span className="text-white font-medium">
                {gold ? `$${gold.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'جاري الجلب...'}
              </span>
              <span className="flex items-center gap-0.5 text-xs">
                {renderTrend(gold)}
                <span className={gold?.direction === 'up' ? 'text-emerald-400' : gold?.direction === 'down' ? 'text-rose-400' : 'text-slate-400'}>
                  {gold?.direction === 'up' ? '▲' : gold?.direction === 'down' ? '▼' : '▬'}
                </span>
              </span>
            </div>

            <span className="text-slate-700 hidden sm:inline">|</span>

            {/* BTC Live */}
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-cyan-400 font-semibold">₿ البيتكوين BTC/USD</span>
              <span className="text-white font-medium">
                {btc ? `$${btc.price.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : 'جاري الجلب...'}
              </span>
              <span className="flex items-center gap-0.5 text-xs">
                {renderTrend(btc)}
                <span className={btc?.direction === 'up' ? 'text-emerald-400' : btc?.direction === 'down' ? 'text-rose-400' : 'text-slate-400'}>
                  {btc?.direction === 'up' ? '▲' : btc?.direction === 'down' ? '▼' : '▬'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onUpdatePrices}
              disabled={isUpdatingPrices}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 cursor-pointer"
              title="تحديث أسعار الذهب والبيتكوين وقنوات التليجرام الآن"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdatingPrices ? 'animate-spin text-cyan-400' : ''}`} />
              <span>تحديث الأسعار</span>
            </button>
            <span className="text-slate-500 text-[11px] hidden md:inline">
              آخر فحص: {gold?.timestamp ? new Date(gold.timestamp).toLocaleTimeString('ar-SA') : 'الآن'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30 ring-1 ring-white/10">
            <Send className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                MZ Telegram Automation
              </h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                isRunning ? 'bg-emerald-950/80 text-emerald-400 ring-1 ring-emerald-800/60' : 'bg-amber-950/80 text-amber-400 ring-1 ring-amber-800/60'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                {isRunning ? 'المحرك نشط' : 'متوقف مؤقتًا'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ناقل قنوات تيليجرام الذكي · تصفية الروابط · أسعار حية
            </p>
          </div>
        </div>

        {/* Global Quick Actions & Admin Menu */}
        <div className="flex items-center gap-2.5">
          {/* Pause / Resume Button */}
          {isRunning ? (
            <button
              onClick={() => onControlEngine('pause')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إيقاف النقل مؤقتًا</span>
            </button>
          ) : (
            <button
              onClick={() => onControlEngine('start')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">استئناف النقل</span>
            </button>
          )}

          {/* Broadcast Static Message */}
          <button
            onClick={onBroadcastStatic}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 transition-colors cursor-pointer"
            title="نشر الرسالة الثابتة إلى قنوات الواجهات المحددة"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">نشر الرسالة الثابتة</span>
          </button>

          {/* Admin Info & Logout */}
          <div className="flex items-center gap-2 mr-2 pr-3 border-r border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="font-medium hidden sm:inline">{username}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

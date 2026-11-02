import React, { useState } from 'react';
import {
  Send,
  Radio,
  Share2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { SystemStats, ForwardedMessage, AuditLog, SystemSettings } from '../types';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface DashboardTabProps {
  stats: SystemStats | null;
  settings: SystemSettings | null;
  recentMessages: ForwardedMessage[];
  recentLogs: AuditLog[];
  onNavigateTab: (tabId: string) => void;
  onUpdatePrices: () => void;
  onBroadcastStatic: () => void;
  onTestBot: () => void;
  onDeleteMessage?: (id: string) => Promise<void>;
  isUpdatingPrices: boolean;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  settings,
  recentMessages,
  recentLogs,
  onNavigateTab,
  onUpdatePrices,
  onBroadcastStatic,
  onTestBot,
  onDeleteMessage,
  isUpdatingPrices,
}) => {
  const [itemToDelete, setItemToDelete] = useState<ForwardedMessage | null>(null);
  const gold = stats?.lastGoldPrice;
  const btc = stats?.lastBtcPrice;
  const isRunning = stats?.engineStatus === 'running';

  return (
    <div className="space-y-6">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Source Channels */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">قنوات المصدر المراقبة</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center border border-blue-800/40">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.totalSource ?? 0}</span>
            <span className="text-xs text-blue-400 font-medium">({stats?.activeSource ?? 0} نشطة)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span>الاستماع التلقائي</span>
            <button
              onClick={() => onNavigateTab('sources')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              إدارة القنوات <ArrowRight className="w-3 h-3 rotate-180" />
            </button>
          </div>
        </div>

        {/* Destination Channels */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">قنوات الواجهات والوجهات</span>
            <div className="w-8 h-8 rounded-lg bg-purple-950/60 text-purple-400 flex items-center justify-center border border-purple-800/40">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.totalDest ?? 0}</span>
            <span className="text-xs text-purple-400 font-medium">({stats?.activeDest ?? 0} نشطة)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span>صلاحيات النشر</span>
            <button
              onClick={() => onNavigateTab('destinations')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              فحص الوجهات <ArrowRight className="w-3 h-3 rotate-180" />
            </button>
          </div>
        </div>

        {/* Successful Forwards */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">الرسائل المنقولة بنجاح</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{stats?.successForwards ?? 0}</span>
            <span className="text-xs text-slate-400">رسالة مصفاة</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span>منع التكرار الصارم</span>
            <span className="text-emerald-400 font-medium">مُفعل 100%</span>
          </div>
        </div>

        {/* Failed Forwards */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">الرسائل المتعثرة / الفاشلة</span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center border border-rose-800/40">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">{stats?.failedForwards ?? 0}</span>
            <span className="text-xs text-slate-400">تحتاج مراجعة</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span>إعادة المحاولة المباشرة</span>
            <button
              onClick={() => onNavigateTab('deduplication')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              عرض السجل <ArrowRight className="w-3 h-3 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Market Cards & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Gold & Bitcoin Ticker Card */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="text-base font-semibold text-white">الأسعار المباشرة ورسالة القنوات</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onUpdatePrices}
                disabled={isUpdatingPrices}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingPrices ? 'animate-spin text-cyan-400' : ''}`} />
                <span>تحديث الآن وتعديل القنوات</span>
              </button>
              <button
                onClick={() => onNavigateTab('prices')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                الإعدادات والقوالب
              </button>
            </div>
          </div>

          {/* Cards for Gold & BTC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Gold */}
            <div className="bg-slate-950/60 border border-amber-900/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">⚡ الذهب XAU/USD</span>
                <span className="text-[11px] text-slate-400">أونصة تروي</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  ${gold ? gold.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                </span>
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  gold?.direction === 'up' ? 'text-emerald-400' : gold?.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {gold?.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : gold?.direction === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                  <span>{gold?.direction === 'up' ? '🟢 ▲' : gold?.direction === 'down' ? '🔴 ▼' : '⚪ ▬'}</span>
                  <span>{gold ? `${gold.changePercent}%` : ''}</span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                المصدر: {gold?.source || 'Yahoo Finance Spot'}
              </div>
            </div>

            {/* Bitcoin */}
            <div className="bg-slate-950/60 border border-cyan-900/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-cyan-400">₿ البيتكوين BTC/USD</span>
                <span className="text-[11px] text-slate-400">دولار أمريكي</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  ${btc ? btc.price.toLocaleString('en-US', { minimumFractionDigits: 0 }) : '—'}
                </span>
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  btc?.direction === 'up' ? 'text-emerald-400' : btc?.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {btc?.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : btc?.direction === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                  <span>{btc?.direction === 'up' ? '🟢 ▲' : btc?.direction === 'down' ? '🔴 ▼' : '⚪ ▬'}</span>
                  <span>{btc ? `${btc.changePercent}%` : ''}</span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                المصدر: {btc?.source || 'Binance Live Ticker'}
              </div>
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
            <div className="text-[11px] text-slate-500 font-sans mb-1 flex items-center justify-between">
              <span>معاينة رسالة القناة المحدثة:</span>
              <span className="text-emerald-400">تحديث تلقائي بدون تكرار (Edit Message)</span>
            </div>
            {`⚡ الذهب XAU/USD: ${gold ? gold.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '4,041.30'}$ | ${gold?.direction === 'up' ? '🟢 ▲' : '🔴 ▼'}\n₿ البيتكوين BTC/USD: ${btc ? btc.price.toLocaleString('en-US', { minimumFractionDigits: 0 }) : '80,415'}$ | ${btc?.direction === 'up' ? '🟢 ▲' : '🔴 ▼'}\nآخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`}
          </div>
        </div>

        {/* System Health & Quick Action Center */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white pb-3 border-b border-slate-800/60 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>جاهزية النظام والاتصال</span>
            </h2>

            <div className="space-y-3 mt-4 text-xs">
              {/* Bot Token status */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div>
                  <div className="font-medium text-slate-200">Telegram Bot API</div>
                  <div className="text-[11px] text-slate-500">
                    {settings?.hasBotToken ? 'الرمز مُسجل وجاهز للإرسال' : 'لم يتم إدخال رمز البوت بعد'}
                  </div>
                </div>
                <button
                  onClick={onTestBot}
                  className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 rounded border border-cyan-800/60 transition-colors cursor-pointer"
                >
                  فحص الرمز
                </button>
              </div>

              {/* Deduplication status */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div>
                  <div className="font-medium text-slate-200">منع تكرار المنشورات</div>
                  <div className="text-[11px] text-slate-500">سجل SQLite مع قيد فريد صارم</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60">
                  نشط 100%
                </span>
              </div>

              {/* URL Filter status */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <div>
                  <div className="font-medium text-slate-200">تصفية الروابط الذكية</div>
                  <div className="text-[11px] text-slate-500">حذف الروابط مع الحفاظ على النص والوسائط</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60">
                  {settings?.removeUrlsText ? 'مفعل' : 'معطل'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateTab('forwarder')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>مختبر التصفية</span>
            </button>
            <button
              onClick={onBroadcastStatic}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>نشر الثابتة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Forwards & Audit Logs Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Forwarded Messages */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>آخر الرسائل المنقولة</span>
            </h2>
            <button
              onClick={() => onNavigateTab('deduplication')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              عرض السجل الكامل
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {recentMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                لا توجد رسائل منقولة حتى الآن. استخدم مختبر النقل لتجربة رسالة!
              </div>
            ) : (
              recentMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 truncate">{msg.sourceChannelName}</span>
                      <span className="text-slate-600">←</span>
                      <span className="text-cyan-400 truncate">{msg.destinationChannelName}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] truncate">{msg.contentPreview}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>النوع: {msg.messageType}</span>
                      <span>·</span>
                      <span>روابط محذوفة: {msg.linksRemovedCount}</span>
                      <span>·</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString('ar-SA')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {msg.status === 'success' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 whitespace-nowrap">
                        تم الإرسال
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60 whitespace-nowrap">
                        تعثر
                      </span>
                    )}

                    {onDeleteMessage && (
                      <button
                        onClick={() => setItemToDelete(msg)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                        title="حذف هذا الخبر من السجل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>سجل أحداث النظام</span>
            </h2>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              عرض السجلات
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                لا توجد سجلات بعد.
              </div>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs flex items-start gap-2.5"
                >
                  <div className="mt-0.5">
                    {log.level === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                    {log.level === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {log.level === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {log.level === 'info' && <Clock className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 font-medium">{log.message}</div>
                    {log.details && <div className="text-[11px] text-slate-500 truncate">{log.details}</div>}
                    <div className="text-[10px] text-slate-600 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString('ar-SA')} · {log.category}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal for News/Message */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="تأكيد حذف الخبر من السجل"
        message={`هل أنت متأكد من رغبتك في حذف الخبر #${itemToDelete?.sourceMessageId} ("${itemToDelete?.contentPreview.slice(0, 50)}...") من سجل المنشورات؟`}
        confirmText="نعم، حذف الخبر"
        cancelText="إلغاء"
        isDanger={true}
        onConfirm={async () => {
          if (itemToDelete && onDeleteMessage) {
            const id = itemToDelete.id;
            setItemToDelete(null);
            await onDeleteMessage(id);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

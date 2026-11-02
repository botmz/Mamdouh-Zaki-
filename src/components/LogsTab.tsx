import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { AuditLog } from '../types';

interface LogsTabProps {
  logs: AuditLog[];
  onRefresh: () => Promise<void>;
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs, onRefresh }) => {
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const matchesLevel = levelFilter === 'all' || l.level === levelFilter;
    const matchesSearch =
      l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.details && l.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">سجل أحداث النظام والتشخيص (Audit & Error Logs)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            متابعة شاملة لكافة العمليات الحية، تحديثات الأسعار، أخطاء الاتصال بتيليجرام، وتفاصيل محاولات الإرسال.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>تحديث السجلات</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في السجلات..."
            className="w-full pr-9 pl-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto justify-end">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              levelFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setLevelFilter('error')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              levelFilter === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-800/60' : 'text-slate-400 hover:text-white'
            }`}
          >
            أخطاء
          </button>
          <button
            onClick={() => setLevelFilter('warning')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              levelFilter === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'text-slate-400 hover:text-white'
            }`}
          >
            تحذيرات
          </button>
          <button
            onClick={() => setLevelFilter('success')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              levelFilter === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'text-slate-400 hover:text-white'
            }`}
          >
            نجاح
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800/50">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            لا توجد سجلات تطابق البحث.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-start gap-3 text-xs">
              <div className="mt-0.5">
                {log.level === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {log.level === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {log.level === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {log.level === 'info' && <Clock className="w-4 h-4 text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">{log.message}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{log.category}</span>
                    <span>{new Date(log.timestamp).toLocaleString('ar-SA')}</span>
                  </div>
                </div>

                {log.details && (
                  <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/60 font-mono text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {log.details}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

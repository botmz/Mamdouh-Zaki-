import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Image,
  Video,
  Database,
  Trash2,
} from 'lucide-react';
import { ForwardedMessage } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface DeduplicationTabProps {
  messages: ForwardedMessage[];
  onRetryMessage: (id: string) => Promise<void>;
  onDeleteMessage?: (id: string) => Promise<void>;
  onClearAllMessages?: () => Promise<void>;
}

export const DeduplicationTab: React.FC<DeduplicationTabProps> = ({
  messages,
  onRetryMessage,
  onDeleteMessage,
  onClearAllMessages,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ForwardedMessage | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await onRetryMessage(id);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.sourceChannelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.destinationChannelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.contentPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(m.sourceMessageId).includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const successCount = messages.filter((m) => m.status === 'success').length;
  const failedCount = messages.filter((m) => m.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">سجل منع التكرار وإعادة توجيه الرسائل (Deduplication Ledger)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            قيد فريد صارم <code className="text-cyan-300 font-mono">UNIQUE(source_id, msg_id, dest_id)</code> في قاعدة البيانات يضمن عدم إرسال نفس المنشور أكثر من مرة إطلاقًا حتى بعد انقطاع الإنترنت أو إعادة تشغيل الخادم.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onClearAllMessages && messages.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح كامل السجل</span>
            </button>
          )}

          <div className="text-xs text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>نجاح: <strong className="text-emerald-400 font-mono">{successCount}</strong></span>
            <span>·</span>
            <span>تعثر: <strong className="text-rose-400 font-mono">{failedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الرسالة، النص، أو اسم القناة..."
            className="w-full pr-9 pl-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto justify-end">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({messages.length})
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'text-slate-400 hover:text-white'
            }`}
          >
            الناجحة ({successCount})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'failed' ? 'bg-rose-950 text-rose-400 border border-rose-800/60' : 'text-slate-400 hover:text-white'
            }`}
          >
            المتعثرة ({failedCount})
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p>لا توجد رسائل مسجلة تطابق معايير الفلترة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800/60 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">معرف الرسالة</th>
                  <th className="py-3 px-4 font-medium">قناة المصدر</th>
                  <th className="py-3 px-4 font-medium">قناة الواجهة</th>
                  <th className="py-3 px-4 font-medium">مقتطف النص بعد التصفية</th>
                  <th className="py-3 px-4 font-medium">روابط محذوفة</th>
                  <th className="py-3 px-4 font-medium">حالة الإرسال</th>
                  <th className="py-3 px-4 font-medium">الوقت</th>
                  <th className="py-3 px-4 font-medium text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Message ID & Type */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-200">#{msg.sourceMessageId}</div>
                      <div className="text-[10px] text-slate-500">{msg.messageType}</div>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {msg.sourceChannelName}
                    </td>

                    {/* Destination */}
                    <td className="py-3.5 px-4 text-cyan-400 font-medium">
                      {msg.destinationChannelName}
                    </td>

                    {/* Preview */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                      <div className="truncate" title={msg.contentPreview}>
                        {msg.contentPreview}
                      </div>
                      {msg.errorDetail && (
                        <div className="text-[10px] text-rose-400 truncate mt-0.5" title={msg.errorDetail}>
                          سبب التعثر: {msg.errorDetail}
                        </div>
                      )}
                    </td>

                    {/* Links removed */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        msg.linksRemovedCount > 0 ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {msg.linksRemovedCount} رابط
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {msg.status === 'success' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ناجح</span>
                        </span>
                      )}
                      {msg.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60">
                          <XCircle className="w-3 h-3" />
                          <span>فشل ({msg.retries} محاولات)</span>
                        </span>
                      )}
                      {msg.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>قيد الإرسال</span>
                        </span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString('ar-SA')}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {msg.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(msg.id)}
                            disabled={retryingId === msg.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:text-white bg-rose-950 hover:bg-rose-900 border border-rose-800 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="إعادة إرسال الرسالة إلى القناة"
                          >
                            <RotateCcw className={`w-3 h-3 ${retryingId === msg.id ? 'animate-spin' : ''}`} />
                            <span>{retryingId === msg.id ? 'إعادة...' : 'إعادة'}</span>
                          </button>
                        )}

                        {onDeleteMessage && (
                          <button
                            onClick={() => setItemToDelete(msg)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                            title="حذف هذا الخبر من السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Single News Item Modal */}
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

      {/* Clear All Messages Modal */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="تأكيد مسح كامل سجل الأخبار والمنشورات"
        message="هل أنت متأكد من رغبتك في مسح كامل سجل الرسائل والمنشورات المنقولة؟ سيتم تفريغ السجل بالكامل."
        confirmText="نعم، مسح السجل بالكامل"
        cancelText="إلغاء"
        isDanger={true}
        onConfirm={async () => {
          if (onClearAllMessages) {
            setShowClearAllModal(false);
            await onClearAllMessages();
          }
        }}
        onCancel={() => setShowClearAllModal(false)}
      />
    </div>
  );
};

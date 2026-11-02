import React, { useState } from 'react';
import {
  Share2,
  Plus,
  Play,
  Pause,
  Trash2,
  Send,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pin,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DestinationChannel } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface DestinationChannelsTabProps {
  destinations: DestinationChannel[];
  onAddDestination: (data: Partial<DestinationChannel>) => Promise<void>;
  onUpdateDestination: (id: string, updates: Partial<DestinationChannel>) => Promise<void>;
  onDeleteDestination: (id: string) => Promise<void>;
  onTestDestination: (id: string) => Promise<any>;
  onTestSendDestination: (id: string) => Promise<any>;
}

export const DestinationChannelsTab: React.FC<DestinationChannelsTabProps> = ({
  destinations,
  onAddDestination,
  onUpdateDestination,
  onDeleteDestination,
  onTestDestination,
  onTestSendDestination,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [priority, setPriority] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Status & modal for testing
  const [testResult, setTestResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      setErrorMsg('يرجى إدخال اسم القناة والمعرف أو الرابط');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onAddDestination({
        name: name.trim(),
        username: username.trim(),
        telegramId: telegramId.trim() || undefined,
        priority: Number(priority) || 1,
        isActive: true,
      });
      setName('');
      setUsername('');
      setTelegramId('');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إضافة القناة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestPermissions = async (id: string) => {
    setTestingId(id);
    try {
      const res = await onTestDestination(id);
      setTestResult({ type: 'permissions', ...res });
    } catch (err: any) {
      setTestResult({ type: 'permissions', ok: false, error: err?.message || 'فشل فحص الصلاحيات' });
    } finally {
      setTestingId(null);
    }
  };

  const handleSendTestMessage = async (id: string) => {
    setSendingTestId(id);
    try {
      const res = await onTestSendDestination(id);
      setTestResult({ type: 'send_test', ...res });
    } catch (err: any) {
      setTestResult({ type: 'send_test', ok: false, error: err?.message || 'فشل إرسال رسالة الاختبار' });
    } finally {
      setSendingTestId(null);
    }
  };

  const filteredDestinations = destinations.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">إدارة قنوات الواجهات والوجهات (Destination Channels)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            قنوات التيليجرام التي يتم إرسال المنشورات إليها، ونشر رسالة الأسعار المحدثة، وتثبيت الرسالة الثابتة.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قناة واجهة جديدة</span>
        </button>
      </div>

      {/* Permissions instructions */}
      <div className="bg-slate-950/80 border border-purple-900/40 rounded-xl p-4 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-purple-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>خطوات ضبط صلاحيات البوت في قنوات الواجهات:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-slate-400 pr-1">
          <li>أضف البوت كـ <strong className="text-slate-200">مشرف (Administrator)</strong> في القناة المستهدفة.</li>
          <li>
            تأكد من تفعيل صلاحيات: <code className="text-cyan-300 font-mono">نشر الرسائل (Post Messages)</code>، و <code className="text-cyan-300 font-mono">تعديل الرسائل (Edit Messages)</code>، و <code className="text-cyan-300 font-mono">تثبيت الرسائل (Pin Messages)</code>.
          </li>
          <li>استخدم زر «فحص الصلاحيات» ثم «إرسال تجريبي» للتأكد الفوري من الجاهزية.</li>
        </ol>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن قناة واجهة بالاسم أو المعرف..."
            className="w-full pr-9 pl-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-500">
          إجمالي الوجهات: {destinations.length} ({destinations.filter((d) => d.isActive).length} مفعلة)
        </span>
      </div>

      {/* Destinations Table */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden">
        {filteredDestinations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <Share2 className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p>لا توجد قنوات واجهات مضافة بعد.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
            >
              أضف قناة استقبال الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800/60 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">قناة الاستقبال</th>
                  <th className="py-3 px-4 font-medium">المعرّف / Chat ID</th>
                  <th className="py-3 px-4 font-medium">معرف رسالة الأسعار</th>
                  <th className="py-3 px-4 font-medium">آخر إرسال</th>
                  <th className="py-3 px-4 font-medium">الأولوية</th>
                  <th className="py-3 px-4 font-medium">حالة النشر</th>
                  <th className="py-3 px-4 font-medium text-center">الإجراءات والاختبار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDestinations.map((dest) => (
                  <tr key={dest.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{dest.name}</div>
                      {dest.lastErrorMessage && (
                        <div className="text-[10px] text-rose-400 truncate max-w-xs" title={dest.lastErrorMessage}>
                          ⚠️ {dest.lastErrorMessage}
                        </div>
                      )}
                    </td>

                    {/* Username */}
                    <td className="py-3.5 px-4 font-mono text-purple-400">
                      {dest.username}
                      {dest.telegramId && (
                        <div className="text-[10px] text-slate-500">{dest.telegramId}</div>
                      )}
                    </td>

                    {/* Active Prices Msg ID */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {dest.currentPricesMsgId ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 text-[11px]">
                          Msg #{dest.currentPricesMsgId}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">لم تنشر بعد</span>
                      )}
                    </td>

                    {/* Last Dispatch */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {dest.lastDispatchedAt ? (
                        <div>
                          <div>{new Date(dest.lastDispatchedAt).toLocaleTimeString('ar-SA')}</div>
                          <div className="text-[10px] text-slate-500">
                            {dest.lastStatus === 'success' ? 'ناجح' : 'فشل'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600">جديدة</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                        {dest.priority}
                      </span>
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onUpdateDestination(dest.id, { isActive: !dest.isActive })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          dest.isActive
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60'
                            : 'bg-amber-950/80 text-amber-400 border border-amber-800/60 hover:bg-amber-900/60'
                        }`}
                      >
                        {dest.isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        <span>{dest.isActive ? 'مفعلة' : 'متوقفة'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Check permissions */}
                        <button
                          onClick={() => handleTestPermissions(dest.id)}
                          disabled={testingId === dest.id}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer disabled:opacity-50"
                          title="فحص رتبة المشرف وصلاحيات النشر"
                        >
                          {testingId === dest.id ? 'فحص...' : 'فحص الصلاحيات'}
                        </button>

                        {/* Send Test Message */}
                        <button
                          onClick={() => handleSendTestMessage(dest.id)}
                          disabled={sendingTestId === dest.id}
                          className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded transition-colors cursor-pointer disabled:opacity-50"
                          title="إرسال رسالة اختبارية حقيقية إلى القناة"
                        >
                          {sendingTestId === dest.id ? 'جاري الإرسال...' : 'إرسال تجريبي'}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setChannelToDelete({ id: dest.id, name: dest.name })}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="حذف القناة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Destination Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>إضافة قناة واجهة جديدة (Destination)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  اسم القناة (للتنظيم) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: قناة VIP المتابعين الرسمية"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  معرّف القناة العام أو Chat ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: @MyOfficialChannel أو -1002998877665"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  إذا كانت القناة عامة اكتب <code className="text-purple-300 font-mono">@username</code>، وإذا كانت خاصة استخدم المعرف الرقمي مثل <code className="text-purple-300 font-mono">-100...</code>
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  المعرّف الرقمي Telegram Chat ID (اختياري)
                </label>
                <input
                  type="text"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="مثال: -1002998877665"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">أولوية الإرسال والتوزيع</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'إضافة القناة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test / Send Feedback Dialog */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>
                  {testResult.type === 'send_test' ? 'نتيجة إرسال الرسالة التجريبية' : 'نتيجة فحص صلاحيات البوت'}
                </span>
              </h3>
              <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {testResult.ok ? (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 space-y-1.5">
                  <div className="font-semibold text-sm">
                    {testResult.type === 'send_test'
                      ? 'تم إرسال الرسالة إلى القناة بنجاح! 🚀'
                      : 'البوت متصل ويملك صلاحيات النشر الكاملة! ✅'}
                  </div>
                  {testResult.messageId && (
                    <div className="text-[11px] text-emerald-400 font-mono">
                      معرف الرسالة في تيليجرام: #{testResult.messageId}
                    </div>
                  )}
                  {testResult.chatTitle && (
                    <div className="text-xs text-slate-200">
                      اسم القناة: <strong>{testResult.chatTitle}</strong>
                    </div>
                  )}
                  {testResult.isSample && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-emerald-800/40">
                      💡 ملاحظة: هذه قناة نموذجية تجريبية للتوضيح. لاختبار قناتك الخاصة، أضف معرف قناتك الحقيقي.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 space-y-2">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>تنبيه أثناء فحص القناة</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-2.5 rounded border border-rose-900/50">
                    {testResult.error}
                  </div>

                  {testResult.instructions && testResult.instructions.length > 0 && (
                    <div className="pt-2 border-t border-rose-900/40 space-y-1.5 text-[11px]">
                      <div className="font-semibold text-slate-300">الخطوات المطلوبة لحل المشكلة:</div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400 pr-1">
                        {testResult.instructions.map((step: string, i: number) => (
                          <li key={i} className="text-slate-300">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">Telegram API Check</span>
              <button
                onClick={() => setTestResult(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(channelToDelete)}
        title="تأكيد حذف قناة الواجهة"
        message={`هل أنت متأكد من رغبتك في حذف قناة الواجهة "${channelToDelete?.name}" نهائيًا؟`}
        confirmText="نعم، حذف القناة"
        cancelText="إلغاء"
        isDanger={true}
        onConfirm={async () => {
          if (channelToDelete) {
            const id = channelToDelete.id;
            setChannelToDelete(null);
            await onDeleteDestination(id);
          }
        }}
        onCancel={() => setChannelToDelete(null)}
      />
    </div>
  );
};

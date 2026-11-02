import React, { useState } from 'react';
import {
  Radio,
  Plus,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Activity,
  Layers,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { SourceChannel, DestinationChannel } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface SourceChannelsTabProps {
  sources: SourceChannel[];
  destinations: DestinationChannel[];
  onAddSource: (data: Partial<SourceChannel>) => Promise<void>;
  onUpdateSource: (id: string, updates: Partial<SourceChannel>) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onTestSource: (id: string) => Promise<any>;
}

export const SourceChannelsTab: React.FC<SourceChannelsTabProps> = ({
  sources,
  destinations,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onTestSource,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [priority, setPriority] = useState(1);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Test result modal state
  const [testResult, setTestResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
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
      await onAddSource({
        name: name.trim(),
        username: username.trim(),
        telegramId: telegramId.trim() || undefined,
        priority: Number(priority) || 1,
        targetDestinations: selectedTargets,
        isActive: true,
      });
      setName('');
      setUsername('');
      setTelegramId('');
      setSelectedTargets([]);
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل إضافة القناة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await onTestSource(id);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, error: err?.message || 'فشل فحص القناة' });
    } finally {
      setTestingId(null);
    }
  };

  const filteredSources = sources.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Explanation */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">إدارة قنوات المصدر (Source Channels)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            القنوات التي يتم استخراج المنشورات والوسائط منها ونقلها آليًا إلى قنوات الواجهات بعد تصفية الروابط ومنع التكرار.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-md shadow-cyan-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قناة مصدر جديدة</span>
          </button>
        </div>
      </div>

      {/* Info Notice about Telegram Access Permissions */}
      <div className="bg-slate-950/80 border border-blue-900/40 rounded-xl p-4 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <HelpCircle className="w-4 h-4" />
          <span>توضيح متطلبات الوصول وقواعد تيليجرام (Telegram API):</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-400 pr-1">
          <li>
            <strong className="text-slate-200">القنوات العامة (Public Channels):</strong> يمكن رصدها بسهولة عبر اسم المستخدم المسبوق بـ <code className="font-mono text-cyan-300">@username</code> أو رابط <code className="font-mono text-cyan-300">t.me/channel</code>.
          </li>
          <li>
            <strong className="text-slate-200">القنوات الخاصة (Private Channels):</strong> تيليجرام يمنع البوتات العادية من قراءة القنوات الخاصة إلا إذا تمت إضافة البوت كعضو/مشرف فيها، أو عبر ربط <code className="text-amber-300">Telegram Client API (حساب مستخدم / Telethon)</code> المتاح في قسم الإعدادات.
          </li>
        </ul>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن قناة بالاسم أو المعرف..."
            className="w-full pr-9 pl-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-500">
          إجمالي القنوات: {sources.length} ({sources.filter((s) => s.isActive).length} نشطة)
        </span>
      </div>

      {/* Source Channels Table / Grid */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden">
        {filteredSources.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p>لا توجد قنوات مصدر تطابق البحث.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              أضف قناة الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800/60 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">القناة المصدر</th>
                  <th className="py-3 px-4 font-medium">المعرّف / الرابط</th>
                  <th className="py-3 px-4 font-medium">الوجهات المستهدفة</th>
                  <th className="py-3 px-4 font-medium">آخر معالجة</th>
                  <th className="py-3 px-4 font-medium">الأولوية</th>
                  <th className="py-3 px-4 font-medium">الحالة</th>
                  <th className="py-3 px-4 font-medium text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredSources.map((source) => {
                  const mappedDestNames = source.targetDestinations?.length
                    ? destinations
                        .filter((d) => source.targetDestinations.includes(d.id))
                        .map((d) => d.name)
                    : ['جميع الوجهات النشطة'];

                  return (
                    <tr key={source.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{source.name}</div>
                        {source.telegramId && (
                          <div className="text-[10px] text-slate-500 font-mono">{source.telegramId}</div>
                        )}
                      </td>

                      {/* Username / Link */}
                      <td className="py-3.5 px-4 font-mono text-cyan-400">
                        {source.username}
                      </td>

                      {/* Destinations */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {mappedDestNames.map((dName, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50"
                            >
                              {dName}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Last Message */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {source.lastMessageId ? (
                          <div>
                            <div>الرسالة #{source.lastMessageId}</div>
                            <div className="text-[10px] text-slate-500">
                              {source.lastMessageAt ? new Date(source.lastMessageAt).toLocaleTimeString('ar-SA') : '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">بانتظار منشورات جديدة</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300">
                          {source.priority}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onUpdateSource(source.id, { isActive: !source.isActive })}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            source.isActive
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800/60 hover:bg-amber-900/60'
                          }`}
                        >
                          {source.isActive ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          <span>{source.isActive ? 'نشطة' : 'متوقفة'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleTest(source.id)}
                            disabled={testingId === source.id}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer disabled:opacity-50"
                            title="فحص نوع القناة وتوفر الصلاحيات"
                          >
                            {testingId === source.id ? 'جاري الفحص...' : 'فحص الاتصال'}
                          </button>
                          <button
                            onClick={() => setChannelToDelete({ id: source.id, name: source.name })}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                            title="حذف القناة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Source Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>إضافة قناة مصدر جديدة</span>
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
                  اسم القناة (للتنظيم داخل اللوحة) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: قناة أخبار الذهب والعملات"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  معرّف القناة أو رابطها <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: @GoldNewsArabic أو t.me/GoldNewsArabic"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  يقبل المعرف المسبوق بـ @ أو رابط القناة، ويتم منع التكرار آليًا.
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
                  placeholder="مثال: -100123456789 (للقنوات الخاصة)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  توجيه المحتوى إلى قنوات واجهات محددة:
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  {destinations.length === 0 ? (
                    <div className="text-slate-500 text-[11px]">
                      لا توجد قنوات واجهات مضافة بعد. سيتم إرسال المحتوى لجميع الوجهات عند إضافتها.
                    </div>
                  ) : (
                    destinations.map((dest) => (
                      <label key={dest.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTargets.includes(dest.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargets([...selectedTargets, dest.id]);
                            } else {
                              setSelectedTargets(selectedTargets.filter((id) => id !== dest.id));
                            }
                          }}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span className="text-slate-200">{dest.name}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({dest.username})</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  إذا تركت التحديد فارغاً، سيتم الإرسال لجميع قنوات الواجهات النشطة افتراضياً.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">الأولوية في المعالجة</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
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
                  className="px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ القناة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Result Dialog */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>تقرير فحص قناة المصدر</span>
              </h3>
              <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            {testResult.ok === false || testResult.error ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 space-y-2">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <span>⚠️ تعذر الاتصال بالقناة أو التحقق منها</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-2.5 rounded border border-rose-900/50">
                    {testResult.error || 'تأكد من صحة معرف القناة وأنها قناة عامة يمكن الوصول إليها.'}
                  </div>
                  <div className="pt-2 border-t border-rose-900/40 space-y-1 text-[11px] text-slate-300">
                    <div className="font-semibold text-slate-200">إرشادات لحل المشكلة:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 pr-1">
                      <li>تأكد من كتابة معرف القناة بشكل صحيح مثل: <code className="font-mono text-cyan-300">@username</code> أو <code className="font-mono text-cyan-300">t.me/channel</code>.</li>
                      <li>إذا كانت القناة خاصة، يجب توفير جلسة Telegram Client API في الإعدادات أو دعوة البوت إليها.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">القناة:</span>
                  <span className="font-semibold text-white">{testResult.channel || testResult.channelTitle}</span>
                </div>

                {testResult.channelTitle && testResult.channelTitle !== testResult.channel && (
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">العنوان على تيليجرام:</span>
                    <span className="font-medium text-slate-200">{testResult.channelTitle}</span>
                  </div>
                )}

                {testResult.subscribers && (
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">عدد المشتركين:</span>
                    <span className="text-emerald-400 font-mono font-medium">{testResult.subscribers}</span>
                  </div>
                )}

                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">تصنيف القناة:</span>
                  <span className="text-cyan-400 font-semibold">{testResult.accessType || 'قناة تيليجرام'}</span>
                </div>

                {testResult.description && (
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-slate-500 block mb-0.5">الوصف:</span>
                    {testResult.description}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-slate-200 leading-relaxed text-xs">
                  <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <span>✓ جاهزية النقل والقراءة:</span>
                  </div>
                  {testResult.recommendation}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">Telegram Channel Check</span>
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
        title="تأكيد حذف قناة المصدر"
        message={`هل أنت متأكد من رغبتك في حذف قناة المصدر "${channelToDelete?.name}" نهائيًا؟ لن يتم نقل أي منشورات جديدة منها.`}
        confirmText="نعم، حذف القناة"
        cancelText="إلغاء"
        isDanger={true}
        onConfirm={async () => {
          if (channelToDelete) {
            const id = channelToDelete.id;
            setChannelToDelete(null);
            await onDeleteSource(id);
          }
        }}
        onCancel={() => setChannelToDelete(null)}
      />
    </div>
  );
};

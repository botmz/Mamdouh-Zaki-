import React, { useState, useEffect } from 'react';
import {
  Filter,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Link2,
  FileText,
  Image,
  Video,
  Eye,
  Sliders,
} from 'lucide-react';
import { SystemSettings, SourceChannel } from '../types';
import { api } from '../api';

interface MessageForwarderTabProps {
  settings: SystemSettings | null;
  sources: SourceChannel[];
  onSaveSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  onTriggerSimulate: (payload: any) => Promise<any>;
}

export const MessageForwarderTab: React.FC<MessageForwarderTabProps> = ({
  settings,
  sources,
  onSaveSettings,
  onTriggerSimulate,
}) => {
  // Local settings state
  const [removeUrlsText, setRemoveUrlsText] = useState(true);
  const [removeUrlsCaptions, setRemoveUrlsCaptions] = useState(true);
  const [cleanHyperlinksMode, setCleanHyperlinksMode] = useState<'keep_text' | 'strip_all' | 'preserve'>('keep_text');
  const [preserveMediaQuality, setPreserveMediaQuality] = useState(true);
  const [forwardEditedMessages, setForwardEditedMessages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cleaner Sandbox State
  const [sandboxInput, setSandboxInput] = useState(
    'عاجل وحصري: أعلن مجلس الاحتياطي الفيدرالي اليوم تثبيت أسعار الفائدة https://www.bloomberg.com/news\n\nلقراءة [التقرير والتحليل الكامل للمضاربين](https://t.me/example_channel) انقر هنا.\nتواصل معنا عبر https://t.me/contact_us'
  );
  const [sandboxType, setSandboxType] = useState<'text' | 'caption'>('text');
  const [sandboxResult, setSandboxResult] = useState<{
    cleanedText: string;
    linksRemovedCount: number;
    removedUrls: string[];
  } | null>(null);

  // Forward Simulator State
  const [simSourceId, setSimSourceId] = useState('');
  const [simMsgId, setSimMsgId] = useState(1055);
  const [simText, setSimText] = useState('بيان اقتصادي هام: الذهب يسجل مستويات تاريخية جديدة https://goldprice.org');
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (settings) {
      setRemoveUrlsText(settings.removeUrlsText);
      setRemoveUrlsCaptions(settings.removeUrlsCaptions);
      setCleanHyperlinksMode(settings.cleanHyperlinksMode);
      setPreserveMediaQuality(settings.preserveMediaQuality);
      setForwardEditedMessages(settings.forwardEditedMessages);
    }
  }, [settings]);

  useEffect(() => {
    if (sources.length > 0 && !simSourceId) {
      setSimSourceId(sources[0].id);
    }
  }, [sources, simSourceId]);

  // Test cleaner in real-time
  const runSandboxTest = async () => {
    try {
      const res = await api.testCleaner(sandboxInput, sandboxType, {
        removePlainUrls: sandboxType === 'caption' ? removeUrlsCaptions : removeUrlsText,
        cleanHyperlinksMode,
      });
      setSandboxResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    runSandboxTest();
  }, [sandboxInput, sandboxType, removeUrlsText, removeUrlsCaptions, cleanHyperlinksMode]);

  const handleSaveRules = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        removeUrlsText,
        removeUrlsCaptions,
        cleanHyperlinksMode,
        preserveMediaQuality,
        forwardEditedMessages,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulate = async () => {
    if (!simSourceId) return;
    setIsSimulating(true);
    try {
      const res = await onTriggerSimulate({
        sourceChannelId: simSourceId,
        sourceMessageId: simMsgId,
        text: simText,
        messageType: 'text',
      });
      setSimResult(res);
      // Increment ID for next test to allow easy repeated testing
      setSimMsgId((prev) => prev + 1);
    } catch (err: any) {
      setSimResult({ error: err?.message || 'فشلت المحاكاة' });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">قواعد تصفية الروابط ونقل الوسائط</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            التحكم الدقيق في حذف الروابط من النصوص والمرفقات مع الحفاظ الصارم على باقي المحتوى وترتيب الرسائل.
          </p>
        </div>

        <button
          onClick={handleSaveRules}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ بنجاح ✓' : 'حفظ قواعد التصفية'}
        </button>
      </div>

      {/* Rules Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rules Toggles */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800/60">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>إعدادات إزالة الروابط الصريحة والمخفية</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Rule 1: Remove URLs from Text */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={removeUrlsText}
                onChange={(e) => setRemoveUrlsText(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">حذف الروابط من الرسائل النصية</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  يحذف روابط <code className="text-cyan-300 font-mono">http://</code> و <code className="text-cyan-300 font-mono">https://</code> و <code className="text-cyan-300 font-mono">t.me/</code> دون حذف الرسالة الأصلية.
                </div>
              </div>
            </label>

            {/* Rule 2: Remove URLs from Captions */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={removeUrlsCaptions}
                onChange={(e) => setRemoveUrlsCaptions(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">حذف الروابط من نصوص الوسائط (Caption)</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  تصفية الروابط من وصف الصور والفيديوهات والملفات دون حذف أو تخريب الوسائط الأصلية.
                </div>
              </div>
            </label>

            {/* Rule 3: Hyperlinks Handling */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200">معالجة الروابط المخفية داخل النص المنسق (Hyperlinks):</div>
              <div className="space-y-1.5 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hyperlinkMode"
                    value="keep_text"
                    checked={cleanHyperlinksMode === 'keep_text'}
                    onChange={() => setCleanHyperlinksMode('keep_text')}
                    className="text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-200">
                    <strong>الاحتفاظ بنص الرابط وحذف الرابط فقط (موصى به)</strong>
                  </span>
                </label>
                <div className="text-slate-500 pr-5">
                  مثال: تحويل <code className="font-mono text-cyan-300">[قراءة الخبر](https://...)</code> إلى <code className="text-emerald-400">قراءة الخبر</code>.
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="hyperlinkMode"
                    value="strip_all"
                    checked={cleanHyperlinksMode === 'strip_all'}
                    onChange={() => setCleanHyperlinksMode('strip_all')}
                    className="text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-300">حذف النص والرابط معاً</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="hyperlinkMode"
                    value="preserve"
                    checked={cleanHyperlinksMode === 'preserve'}
                    onChange={() => setCleanHyperlinksMode('preserve')}
                    className="text-slate-300"
                  />
                  <span className="text-slate-300">الإبقاء على الروابط المنسقة دون تعديل</span>
                </label>
              </div>
            </div>

            {/* Rule 4: Preserve Quality */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveMediaQuality}
                onChange={(e) => setPreserveMediaQuality(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">المحافظة على جودة الوسائط الأصلية</div>
                <div className="text-[11px] text-slate-400">
                  إرسال الصور والفيديوهات والملفات الصوتية والمستندات بأعلى جودة ممكنة ودعم الألبومات.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Real-Time Interactive Cleaner Sandbox */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>مختبر المعاينة اللحظي (Cleaner Sandbox)</span>
            </h3>
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setSandboxType('text')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  sandboxType === 'text' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                رسالة نصية
              </button>
              <button
                onClick={() => setSandboxType('caption')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  sandboxType === 'caption' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                وصف صورة/فيديو (Caption)
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">النص الأصلي الوارد من المصدر:</label>
              <textarea
                rows={4}
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                placeholder="الصق أي نص تجريبي هنا..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-emerald-400">النص النهائي بعد تطبيق قواعد التصفية:</span>
                <span className="text-slate-400">
                  تم حذف: <strong className="text-cyan-400 font-mono">{sandboxResult?.linksRemovedCount || 0}</strong> رابط
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 text-white text-xs leading-relaxed whitespace-pre-wrap min-h-16">
                {sandboxResult?.cleanedText || <span className="text-slate-600 italic">(نص فارغ)</span>}
              </div>

              {sandboxResult?.removedUrls && sandboxResult.removedUrls.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 block mb-1">الروابط التي تم اكتشافها واستبعادها:</span>
                  <div className="flex flex-wrap gap-1">
                    {sandboxResult.removedUrls.map((url, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-900/40 font-mono text-[10px]">
                        {url}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forwarding Engine Simulation & Deduplication Verification */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>محاكي نقل الرسائل واختبار منع التكرار (Deduplication Test)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              جرب إرسال رسالة برقم معرف محدد، ثم كرر المحاولة بنفس المعرف للتأكد من حظر التكرار عبر قيد قاعدة البيانات.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">قناة المصدر:</label>
            <select
              value={simSourceId}
              onChange={(e) => setSimSourceId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">معرف الرسالة المصدر (Message ID):</label>
            <input
              type="number"
              value={simMsgId}
              onChange={(e) => setSimMsgId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isSimulating || !simSourceId}
              className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'جاري المعالجة...' : 'تشغيل المحاكاة والنقل'}</span>
            </button>
          </div>
        </div>

        <div className="text-xs">
          <label className="block text-slate-300 font-medium mb-1">محتوى الرسالة للتجربة:</label>
          <input
            type="text"
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Simulation Output */}
        {simResult && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>تقرير نتائج المحاكاة:</span>
              <span className={simResult.processed ? 'text-emerald-400' : 'text-amber-400'}>
                {simResult.processed ? 'تمت المعالجة بنجاح' : 'تنبيه في المعالجة'}
              </span>
            </div>

            {simResult.results && simResult.results.length > 0 && (
              <div className="space-y-1">
                {simResult.results.map((res: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded flex items-center justify-between font-mono text-[11px] ${
                      res.status === 'success'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                        : res.status === 'skipped_duplicate'
                        ? 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
                        : 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                    }`}
                  >
                    <span>الوجهة: {res.destinationId}</span>
                    <span>
                      {res.status === 'success' && '✓ تم الإرسال وتسجيل المعرف'}
                      {res.status === 'skipped_duplicate' && '⛔ تم الحظر: الرسالة مكررة ومسجلة مسبقاً في السجل!'}
                      {res.status === 'failed' && `✕ فشل: ${res.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

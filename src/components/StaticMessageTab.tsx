import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Pin,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Share2,
} from 'lucide-react';
import { SystemSettings, DestinationChannel } from '../types';

interface StaticMessageTabProps {
  settings: SystemSettings | null;
  destinations: DestinationChannel[];
  onSaveSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  onBroadcast: (payload: { text?: string; pin?: boolean; channelIds?: string[] }) => Promise<any>;
}

export const StaticMessageTab: React.FC<StaticMessageTabProps> = ({
  settings,
  destinations,
  onSaveSettings,
  onBroadcast,
}) => {
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [pinMessage, setPinMessage] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [autoOnStart, setAutoOnStart] = useState(false);
  const [autoOnNewChannel, setAutoOnNewChannel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setText(settings.staticMessageText);
      setEnabled(settings.staticMessageEnabled);
      setPinMessage(settings.staticMessagePin);
      setSelectedChannels(settings.staticMessageDestinations || []);
      setAutoOnStart(settings.staticMessageAutoOnStart);
      setAutoOnNewChannel(settings.staticMessageAutoOnNewChannel);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        staticMessageText: text,
        staticMessageEnabled: enabled,
        staticMessagePin: pinMessage,
        staticMessageDestinations: selectedChannels,
        staticMessageAutoOnStart: autoOnStart,
        staticMessageAutoOnNewChannel: autoOnNewChannel,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!text.trim()) return;
    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await onBroadcast({
        text,
        pin: pinMessage,
        channelIds: selectedChannels.length > 0 ? selectedChannels : undefined,
      });
      setBroadcastResult(res);
    } catch (err: any) {
      setBroadcastResult({ success: false, error: err?.message || 'فشل النشر' });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">الرسالة الثابتة والمثبتة (Pinned Message)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            رسالة خاصة بك يمكنك صياغتها ونشرها وتثبيتها في أعلى قنوات الواجهات كما كتبتها تمامًا، وهي مستقلة تمامًا عن رسائل المصدر.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ ✓' : 'حفظ التعديلات'}
          </button>
          <button
            onClick={handleBroadcast}
            disabled={isBroadcasting || !text.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isBroadcasting ? 'جاري النشر والتثبيت...' : 'نشر وتثبيت الآن'}</span>
          </button>
        </div>
      </div>

      {/* Editor & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor & Controls */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800/60">
            <span>محرر الرسالة الثابتة</span>
            <label className="flex items-center gap-2 text-xs font-normal text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>تفعيل الرسالة الثابتة</span>
            </label>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                نص الرسالة (يدعم HTML و روابطك الخاصة):
              </label>
              <textarea
                rows={9}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب رسالتك الثابتة هنا..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs leading-relaxed focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Quick helper tag buttons */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>تنسيق سريع:</span>
              <button
                type="button"
                onClick={() => setText((t) => t + ' <b>خط عريض</b> ')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
              >
                &lt;b&gt;عريض&lt;/b&gt;
              </button>
              <button
                type="button"
                onClick={() => setText((t) => t + ' <i>مائل</i> ')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
              >
                &lt;i&gt;مائل&lt;/i&gt;
              </button>
              <button
                type="button"
                onClick={() => setText((t) => t + ' <a href="https://t.me/yourlink">رابط خاص</a> ')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono"
              >
                &lt;a href="..."&gt;رابط&lt;/a&gt;
              </button>
            </div>

            {/* Automation Options */}
            <div className="pt-3 border-t border-slate-800/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinMessage}
                  onChange={(e) => setPinMessage(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-200 font-medium">تثبيت الرسالة (Pin Message) داخل القنوات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOnNewChannel}
                  onChange={(e) => setAutoOnNewChannel(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300">نشرها تلقائيًا عند إضافة قناة واجهة جديدة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOnStart}
                  onChange={(e) => setAutoOnStart(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300">نشرها تلقائيًا عند بدء تشغيل النظام</span>
              </label>
            </div>

            {/* Target Channels */}
            <div className="pt-3 border-t border-slate-800/60 space-y-1.5">
              <label className="block text-slate-300 font-medium">
                تحديد قنوات الواجهات المستهدفة بالرسالة:
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg">
                {destinations.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(d.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChannels([...selectedChannels, d.id]);
                        } else {
                          setSelectedChannels(selectedChannels.filter((id) => id !== d.id));
                        }
                      }}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-slate-200">{d.name}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({d.username})</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                إذا لم تحدد قنوات، سيتم الإرسال لجميع قنوات الواجهات النشطة.
              </p>
            </div>
          </div>
        </div>

        {/* Telegram Live Simulated Chat Preview */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800/60">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>المعاينة الحية داخل تيليجرام</span>
              </span>
              {pinMessage && (
                <span className="flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  <Pin className="w-3 h-3" />
                  <span>مثبتة في أعلى القناة</span>
                </span>
              )}
            </h3>

            {/* Telegram simulated card */}
            <div className="mt-4 p-4 rounded-xl bg-[#17212b] border border-[#2b5278]/40 shadow-inner space-y-3 font-sans">
              {/* Channel simulated header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/40 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-[10px]">
                    MZ
                  </div>
                  <span className="font-semibold text-slate-200">القناة الرسمية</span>
                </div>
                {pinMessage && (
                  <div className="flex items-center gap-1 text-cyan-400 text-[10px]">
                    <Pin className="w-3 h-3 rotate-45" />
                    <span>رسالة مثبتة</span>
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div className="p-3.5 rounded-lg bg-[#242f3d] text-slate-100 text-xs leading-relaxed whitespace-pre-wrap shadow-sm">
                {text || '(أدخل نص الرسالة الثابتة للمعاينة)'}
              </div>

              <div className="flex justify-end text-[10px] text-slate-400 font-mono">
                {new Date().toLocaleTimeString('ar-SA')} · تم التثبيت
              </div>
            </div>
          </div>

          {/* Broadcast Results feedback */}
          {broadcastResult && (
            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-200">تقرير النشر الأخير:</div>
              {broadcastResult.success ? (
                <div className="text-emerald-400">
                  ✓ تم النشر والتثبيت في {broadcastResult.results?.length || 0} قناة بنجاح.
                </div>
              ) : (
                <div className="text-rose-400">
                  ✕ فشل النشر: {broadcastResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

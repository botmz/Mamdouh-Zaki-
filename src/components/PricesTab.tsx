import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  Share2,
  Sparkles,
} from 'lucide-react';
import { SystemSettings, DestinationChannel, PriceRecord } from '../types';

interface PricesTabProps {
  settings: SystemSettings | null;
  destinations: DestinationChannel[];
  latestPrices: { gold?: PriceRecord; btc?: PriceRecord };
  formattedMessage: string;
  isUpdatingPrices: boolean;
  onUpdatePricesNow: () => Promise<void>;
  onSaveSettings: (updates: Partial<SystemSettings>) => Promise<void>;
}

export const PricesTab: React.FC<PricesTabProps> = ({
  settings,
  destinations,
  latestPrices,
  formattedMessage,
  isUpdatingPrices,
  onUpdatePricesNow,
  onSaveSettings,
}) => {
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [goldEnabled, setGoldEnabled] = useState(true);
  const [btcEnabled, setBtcEnabled] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [template, setTemplate] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [pricesOrder, setPricesOrder] = useState<'above_static' | 'below_static' | 'standalone'>('above_static');
  const [decimalsGold, setDecimalsGold] = useState(2);
  const [decimalsBtc, setDecimalsBtc] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setMasterEnabled(settings.pricesMasterEnabled);
      setGoldEnabled(settings.pricesGoldEnabled);
      setBtcEnabled(settings.pricesBtcEnabled);
      setIntervalMinutes(settings.pricesIntervalMinutes || 5);
      setTemplate(settings.pricesTemplate);
      setSelectedDestinations(settings.pricesDestinations || []);
      setPricesOrder(settings.pricesOrder || 'above_static');
      setDecimalsGold(settings.decimalsGold ?? 2);
      setDecimalsBtc(settings.decimalsBtc ?? 0);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        pricesMasterEnabled: masterEnabled,
        pricesGoldEnabled: goldEnabled,
        pricesBtcEnabled: btcEnabled,
        pricesIntervalMinutes: Number(intervalMinutes) || 5,
        pricesTemplate: template,
        pricesDestinations: selectedDestinations,
        pricesOrder,
        decimalsGold: Number(decimalsGold),
        decimalsBtc: Number(decimalsBtc),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const gold = latestPrices.gold;
  const btc = latestPrices.btc;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">الأسعار المباشرة للذهب والبيتكوين (Live Markets Engine)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            محرك تحديث الأسعار الفورية وتعديل الرسالة نفسها في قنوات الواجهات دون إنشاء رسائل مكررة، مع أسهم ملونة تعبر عن الصعود والهبوط.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onUpdatePricesNow}
            disabled={isUpdatingPrices}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingPrices ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isUpdatingPrices ? 'جاري الجلب والتعديل...' : 'تحديث وتعديل القنوات الآن'}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم حفظ الإعدادات ✓' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* Live Market Assets Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gold Spot */}
        <div className="bg-slate-900/70 border border-amber-900/40 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="font-bold text-white text-base">الذهب الفوري (XAU/USD)</span>
            </div>
            <span className="text-xs text-amber-400 font-mono">أونصة تروي</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              ${gold ? gold.price.toLocaleString('en-US', { minimumFractionDigits: decimalsGold }) : '—'}
            </span>
            <div className={`flex items-center gap-1.5 text-sm font-bold ${
              gold?.direction === 'up' ? 'text-emerald-400' : gold?.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {gold?.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : gold?.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
              <span>{gold?.direction === 'up' ? '🟢 ▲ صاعد' : gold?.direction === 'down' ? '🔴 ▼ هابط' : '⚪ ▬ ثابت'}</span>
              <span>{gold ? `(${gold.changePercent}%)` : ''}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>المصدر: {gold?.source || 'Yahoo Finance (Gold Spot GC=F)'}</span>
            <span>آخر تحديث: {gold ? new Date(gold.timestamp).toLocaleTimeString('ar-SA') : 'الآن'}</span>
          </div>
        </div>

        {/* Bitcoin BTC/USD */}
        <div className="bg-slate-900/70 border border-cyan-900/40 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
              <span className="font-bold text-white text-base">البيتكوين (BTC/USD)</span>
            </div>
            <span className="text-xs text-cyan-400 font-mono">دولار أمريكي</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              ${btc ? btc.price.toLocaleString('en-US', { minimumFractionDigits: decimalsBtc }) : '—'}
            </span>
            <div className={`flex items-center gap-1.5 text-sm font-bold ${
              btc?.direction === 'up' ? 'text-emerald-400' : btc?.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {btc?.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : btc?.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
              <span>{btc?.direction === 'up' ? '🟢 ▲ صاعد' : btc?.direction === 'down' ? '🔴 ▼ هابط' : '⚪ ▬ ثابت'}</span>
              <span>{btc ? `(${btc.changePercent}%)` : ''}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>المصدر: {btc?.source || 'Binance Live Ticker'}</span>
            <span>آخر تحديث: {btc ? new Date(btc.timestamp).toLocaleTimeString('ar-SA') : 'الآن'}</span>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Display and Activation Options */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800/60">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>خيارات التفعيل والقنوات المستهدفة</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Master Toggle */}
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">المفتاح الرئيسي للأسعار المباشرة</div>
                <div className="text-[11px] text-slate-400">إظهار أو إخفاء رسالة الأسعار بالكامل في القنوات</div>
              </div>
              <input
                type="checkbox"
                checked={masterEnabled}
                onChange={(e) => setMasterEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
            </label>

            {/* Asset selection */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200">الأصول المعروضة:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={goldEnabled}
                    onChange={(e) => setGoldEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span className="text-slate-300">عرض سعر الذهب</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={btcEnabled}
                    onChange={(e) => setBtcEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-300">عرض سعر البيتكوين</span>
                </label>
              </div>
            </div>

            {/* Update interval */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
              <label className="block font-semibold text-slate-200">فترة التحديث التلقائي:</label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={1}>كل دقيقة واحدة (1 min)</option>
                <option value={3}>كل 3 دقائق</option>
                <option value={5}>كل 5 دقائق (موصى به لتفادي Flood Limits)</option>
                <option value={15}>كل 15 دقيقة</option>
                <option value={30}>كل 30 دقيقة</option>
                <option value={60}>كل ساعة (1 hour)</option>
              </select>
            </div>

            {/* Decimal digits */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <label className="block text-slate-300 mb-1">خانات الذهب العشرية:</label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={decimalsGold}
                  onChange={(e) => setDecimalsGold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">خانات البيتكوين العشرية:</label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={decimalsBtc}
                  onChange={(e) => setDecimalsBtc(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
            </div>

            {/* Destinations Selection */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
              <label className="block font-semibold text-slate-200">
                قنوات الواجهات المستهدفة برسالة الأسعار:
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto p-2 bg-slate-900 border border-slate-800 rounded">
                {destinations.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.includes(d.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDestinations([...selectedDestinations, d.id]);
                        } else {
                          setSelectedDestinations(selectedDestinations.filter((id) => id !== d.id));
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
                إذا لم يتم التحديد، سيتم النشر والتحديث في كافة قنوات الواجهات النشطة.
              </p>
            </div>
          </div>
        </div>

        {/* Template Customizer & Live Output */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white pb-3 border-b border-slate-800/60 flex items-center justify-between">
            <span>تخصيص قالب رسالة الأسعار</span>
            <span className="text-emerald-400 text-xs font-normal">تحديث في نفس الرسالة (Edit Message)</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">قالب الرسالة (يدعم المتغيرات):</label>
              <textarea
                rows={4}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Variables helper */}
            <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/60 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300">المتغيرات المتاحة في القالب:</span>
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">{'{gold_price}'}</code>
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">{'{gold_arrow}'}</code>
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{'{btc_price}'}</code>
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{'{btc_arrow}'}</code>
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{'{updated_at}'}</code>
              </div>
            </div>

            {/* Live Message Output in Telegram Style */}
            <div className="pt-2">
              <label className="block text-slate-400 mb-1.5 font-medium">الشكل النهائي الفعلي في القناة:</label>
              <div className="p-4 rounded-xl bg-[#17212b] border border-[#2b5278]/40 shadow-inner font-mono text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                {formattedMessage || 'جاري التنسيق...'}
              </div>
            </div>

            {/* Explanation Note */}
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-blue-200 text-[11px] leading-relaxed">
              💡 <strong>سياسة منع الإغراق والتكرار:</strong> يحتفظ النظام بمعرف الرسالة <code className="font-mono text-cyan-300">currentPricesMsgId</code> لكل قناة واجهة، ويقوم بتعديل محتواها دوريًا عبر <code className="font-mono text-cyan-300">editMessageText</code>. لن يتم نشر رسالة جديدة إلا إذا كانت أول مرة أو إذا تم حذف الرسالة السابقة من القناة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

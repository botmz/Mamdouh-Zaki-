import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Bot,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  Activity,
  Server,
} from 'lucide-react';
import { SystemSettings } from '../types';
import { api } from '../api';

interface SettingsTabProps {
  settings: SystemSettings | null;
  onSaveSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  onTestBot: () => Promise<any>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSaveSettings,
  onTestBot,
}) => {
  // Telegram Bot API
  const [botToken, setBotToken] = useState('');
  const [isBotTesting, setIsBotTesting] = useState(false);
  const [botTestResult, setBotTestResult] = useState<any>(null);

  // Telegram Client API (Telethon)
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [sessionString, setSessionString] = useState('');

  // Admin credentials update
  const [adminUsername, setAdminUsername] = useState('admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credMsg, setCredMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  // General Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setBotToken(settings.telegramBotTokenMasked || '');
      setApiId(settings.telegramApiId || '');
      setApiHash(settings.telegramApiHash || '');
      setSessionString(settings.telegramSessionString || '');
    }
  }, [settings]);

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates: Partial<SystemSettings> = {
        telegramApiId: apiId.trim(),
        telegramApiHash: apiHash.trim(),
        telegramSessionString: sessionString.trim(),
      };
      // Only send bot token if user actually typed a new one and not the mask
      if (botToken && !botToken.includes('••••')) {
        updates.telegramBotToken = botToken.trim();
      }
      await onSaveSettings(updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestBot = async () => {
    setIsBotTesting(true);
    setBotTestResult(null);
    try {
      const res = await onTestBot();
      setBotTestResult(res);
    } catch (err: any) {
      setBotTestResult({ ok: false, error: err?.message || 'فشل فحص البوت' });
    } finally {
      setIsBotTesting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredMsg(null);

    if (!currentPassword) {
      setCredMsg({ type: 'error', text: 'يرجى إدخال كلمة المرور الحالية للتأكيد' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setCredMsg({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setCredMsg({ type: 'error', text: 'يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل' });
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await api.updateCredentials(adminUsername, currentPassword, newPassword || undefined);
      setCredMsg({ type: 'success', text: 'تم تحديث بيانات المشرف بنجاح!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setCredMsg({ type: 'error', text: err?.message || 'فشل التحديث' });
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">إعدادات النظام وربط Telegram API والأمان</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            تكوين بيانات الاتصال بواجهات تيليجرام الرسمية، تأمين حساب المشرف، وإرشادات التشغيل المستمر 24/7.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Configuration Form */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800/60">
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>إعدادات تيليجرام (Telegram Bot & Client API)</span>
            </span>
          </h3>

          <form onSubmit={handleSaveTelegram} className="space-y-4 text-xs">
            {/* Telegram Bot Token */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                رمز البوت الرسمي (Telegram Bot Token):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleTestBot}
                  disabled={isBotTesting}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isBotTesting ? 'جاري الفحص...' : 'فحص الرمز'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                احصل عليه عبر محادثة <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 underline">@BotFather</a> على تيليجرام.
              </p>

              {/* Bot Test Result Feedback */}
              {botTestResult && (
                <div className={`mt-2 p-2.5 rounded-lg border text-[11px] ${
                  botTestResult.ok ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}>
                  {botTestResult.ok ? (
                    <div>
                      ✓ تم التحقق بنجاح! البوت: <strong>@{botTestResult.bot?.username}</strong> ({botTestResult.bot?.first_name})
                    </div>
                  ) : (
                    <div>✕ فشل التحقق: {botTestResult.error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Client API for Private Channels */}
            <div className="pt-3 border-t border-slate-800/60 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <span>بيانات Telegram Client API / Telethon (للقنوات الخاصة فقط):</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                البوتات العادية لا تستطيع قراءة القنوات الخاصة ما لم يتم ربط جلسة مستخدم عبر <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-cyan-400 underline">my.telegram.org</a>.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">API ID:</label>
                  <input
                    type="text"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    placeholder="مثال: 12345678"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">API HASH:</label>
                  <input
                    type="password"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    placeholder="مثال: 0123456789abcdef..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الجلسة النصية (StringSession - اختياري):</label>
                <textarea
                  rows={2}
                  value={sessionString}
                  onChange={(e) => setSessionString(e.target.value)}
                  placeholder="الجلسة النصية المولدة للتشغيل المباشر على السيرفر دون طلب كود..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-[10px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                يتم حفظ البيانات مشفرة محلياً في قاعدة البيانات.
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ ✓' : 'حفظ إعدادات تيليجرام'}
              </button>
            </div>
          </form>
        </div>

        {/* Admin Credentials & Security */}
        <div className="space-y-6">
          {/* Security Credentials */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800/60">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>تأمين لوحة التحكم وتغيير كلمة مرور المشرف</span>
            </h3>

            {credMsg && (
              <div className={`p-3 rounded-lg border text-xs ${
                credMsg.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}>
                {credMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">اسم المستخدم للمشرف:</label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  كلمة المرور الحالية <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية للتأكيد..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">كلمة المرور الجديدة:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 خانات على الأقل..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">تأكيد كلمة المرور:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد كتابتها..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isUpdatingCreds}
                  className="px-4 py-2 rounded-lg font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingCreds ? 'جاري التحديث...' : 'تحديث بيانات الدخول'}
                </button>
              </div>
            </form>
          </div>

          {/* 24/7 Hosting Guidelines Notice */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>دليل استقرار التشغيل المستمر 24/7</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              لقد تم تزويد المشروع بملف خدمة لينكس <code className="text-cyan-300 font-mono">systemd/mz-telegram.service</code> وملف <code className="text-cyan-300 font-mono">docker-compose.yml</code>. للتشغيل الحقيقي الدائم دون توقف يوصى بوضعه على سيرفر خاص (VPS) واستخدام نقطة فحص الصحة:
            </p>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-cyan-300 text-[11px] flex items-center justify-between">
              <span>GET /api/health</span>
              <span className="text-emerald-400 font-sans text-[10px]">جاهز للربط مع UptimeRobot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

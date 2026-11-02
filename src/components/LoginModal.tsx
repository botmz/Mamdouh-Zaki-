import React, { useState } from 'react';
import { Send, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setErrorMsg(err?.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 text-right">
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-900/30 ring-1 ring-white/10">
            <Send className="w-7 h-7 -rotate-45" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            MZ Telegram Automation
          </h2>
          <p className="text-xs text-slate-400">
            ناقل قنوات تيليجرام الذكي · تسجيل دخول المشرف
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              اسم المستخدم:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم..."
                className="w-full pr-10 pl-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              كلمة المرور:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور..."
                className="w-full pr-10 pl-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Quick Notice for default admin credentials */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>بيانات المشرف للتشغيل الأولي:</span>
            </div>
            <div>اسم المستخدم الافتراضي: <code className="text-white font-mono">admin</code></div>
            <div>كلمة المرور الافتراضية: <code className="text-white font-mono">admin1234</code></div>
            <div className="text-[10px] text-slate-500 mt-1">
              (يمكنك تغيير كلمة المرور فوراً بعد الدخول من تبويب الإعدادات).
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer disabled:opacity-50 text-xs"
          >
            {isLoading ? 'جاري التحقق...' : 'دخول إلى لوحة التحكم'}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Radio,
  Share2,
  Filter,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Clock,
  Settings,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from './api';
import {
  SystemStats,
  SystemSettings,
  SourceChannel,
  DestinationChannel,
  ForwardedMessage,
  AuditLog,
  PriceRecord,
} from './types';
import { Header } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { SourceChannelsTab } from './components/SourceChannelsTab';
import { DestinationChannelsTab } from './components/DestinationChannelsTab';
import { MessageForwarderTab } from './components/MessageForwarderTab';
import { StaticMessageTab } from './components/StaticMessageTab';
import { PricesTab } from './components/PricesTab';
import { DeduplicationTab } from './components/DeduplicationTab';
import { LogsTab } from './components/LogsTab';
import { SettingsTab } from './components/SettingsTab';
import { LoginModal } from './components/LoginModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(api.getToken()));
  const [username, setUsername] = useState<string>('admin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [sources, setSources] = useState<SourceChannel[]>([]);
  const [destinations, setDestinations] = useState<DestinationChannel[]>([]);
  const [messages, setMessages] = useState<ForwardedMessage[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [latestPrices, setLatestPrices] = useState<{ gold?: PriceRecord; btc?: PriceRecord }>({});
  const [formattedMessage, setFormattedMessage] = useState<string>('');

  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Check auth & fetch data
  const loadAllData = useCallback(async () => {
    try {
      const [statsData, settingsData, sourcesData, destsData, msgsData, logsData, pricesData] = await Promise.all([
        api.getStats(),
        api.getSettings(),
        api.getSources(),
        api.getDestinations(),
        api.getForwarderLogs(100),
        api.getAuditLogs(100),
        api.getCurrentPrices(),
      ]);

      setStats(statsData);
      setSettings(settingsData);
      setSources(sourcesData);
      setDestinations(destsData);
      setMessages(msgsData);
      setLogs(logsData);
      setLatestPrices(pricesData.prices);
      setFormattedMessage(pricesData.formatted);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      const interval = setInterval(loadAllData, 8000); // Poll every 8s for live metrics
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadAllData]);

  // Listen for 401 unauth event
  useEffect(() => {
    const handleAuthReq = () => setIsAuthenticated(false);
    window.addEventListener('mz-auth-required', handleAuthReq);
    return () => window.removeEventListener('mz-auth-required', handleAuthReq);
  }, []);

  // Login handler
  const handleLogin = async (user: string, pass: string) => {
    const res = await api.login(user, pass);
    setUsername(res.username);
    setIsAuthenticated(true);
    showToast('تم تسجيل الدخول بنجاح! مرحبًا بك في لوحة التحكم', 'success');
    loadAllData();
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    showToast('تم تسجيل الخروج بنجاح', 'info');
  };

  // Global Engine Control
  const handleControlEngine = async (action: 'start' | 'pause') => {
    try {
      await api.controlEngine(action);
      showToast(action === 'start' ? 'تم استئناف تشغيل المحرك بنجاح' : 'تم إيقاف المحرك مؤقتًا', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'فشل تغيير حالة المحرك', 'error');
    }
  };

  // Global Update Prices Now
  const handleUpdatePricesNow = async () => {
    setIsUpdatingPrices(true);
    try {
      const res = await api.updatePricesNow();
      setLatestPrices({ gold: res.gold, btc: res.btc });
      setFormattedMessage(res.formatted);
      showToast(`تم تحديث الأسعار بنجاح وتعديل الرسالة في ${res.channelsUpdated?.length || 0} قناة! 🚀`, 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'فشل تحديث الأسعار', 'error');
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  // Global Broadcast Static Message
  const handleBroadcastStatic = async () => {
    try {
      const res = await api.broadcastStaticMessage({});
      showToast(`تم نشر وتثبيت الرسالة الثابتة في ${res.results?.length || 0} قناة بنجاح! ✓`, 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'فشل نشر الرسالة الثابتة', 'error');
    }
  };

  // Bot test
  const handleTestBot = async () => {
    try {
      const res = await api.testBotToken();
      if (res.ok) {
        showToast(`البوت متصل بنجاح: @${res.bot?.username}`, 'success');
      } else {
        showToast(res.error || 'فشل الاتصال بالبوت', 'error');
      }
      return res;
    } catch (err: any) {
      showToast(err?.message || 'فشل فحص البوت', 'error');
      return { ok: false, error: err?.message };
    }
  };

  // Source operations
  const handleAddSource = async (data: Partial<SourceChannel>) => {
    await api.addSource(data);
    showToast('تمت إضافة قناة المصدر بنجاح', 'success');
    loadAllData();
  };

  const handleUpdateSource = async (id: string, updates: Partial<SourceChannel>) => {
    await api.updateSource(id, updates);
    showToast('تم تعديل القناة', 'info');
    loadAllData();
  };

  const handleDeleteSource = async (id: string) => {
    await api.deleteSource(id);
    showToast('تم حذف القناة', 'info');
    loadAllData();
  };

  // Destination operations
  const handleAddDestination = async (data: Partial<DestinationChannel>) => {
    await api.addDestination(data);
    showToast('تمت إضافة قناة الواجهة بنجاح', 'success');
    loadAllData();
  };

  const handleUpdateDestination = async (id: string, updates: Partial<DestinationChannel>) => {
    await api.updateDestination(id, updates);
    showToast('تم تعديل القناة', 'info');
    loadAllData();
  };

  const handleDeleteDestination = async (id: string) => {
    await api.deleteDestination(id);
    showToast('تم حذف القناة', 'info');
    loadAllData();
  };

  // Settings Save
  const handleSaveSettings = async (updates: Partial<SystemSettings>) => {
    await api.updateSettings(updates);
    showToast('تم حفظ التعديلات بنجاح', 'success');
    loadAllData();
  };

  // Delete single forwarded message / news item
  const handleDeleteMessage = async (id: string) => {
    try {
      await api.deleteForward(id);
      showToast('تم حذف الخبر من السجل بنجاح', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'فشل حذف الخبر', 'error');
    }
  };

  // Retry failed forward
  const handleRetryMessage = async (id: string) => {
    try {
      const res = await api.retryForward(id);
      if (res.ok) {
        showToast('تمت إعادة إرسال الرسالة بنجاح!', 'success');
      } else {
        showToast(`فشلت إعادة الإرسال: ${res.error}`, 'error');
      }
      loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'خطأ أثناء الإعادة', 'error');
    }
  };

  // Clear all forwarded messages / news
  const handleClearAllMessages = async () => {
    try {
      await api.clearForwardLogs();
      showToast('تم مسح كامل سجل المنشورات بنجاح', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'فشل مسح السجل', 'error');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'sources', label: 'قنوات المصدر', icon: Radio, count: sources.length },
    { id: 'destinations', label: 'قنوات الواجهات', icon: Share2, count: destinations.length },
    { id: 'forwarder', label: 'تصفية الروابط والمحاكي', icon: Filter },
    { id: 'static', label: 'الرسالة الثابتة', icon: Sparkles },
    { id: 'prices', label: 'الأسعار المباشرة', icon: TrendingUp },
    { id: 'deduplication', label: 'سجل منع التكرار', icon: ShieldCheck, count: messages.length },
    { id: 'logs', label: 'سجل الأحداث', icon: Clock },
    { id: 'settings', label: 'الإعدادات والأمان', icon: Settings },
  ];

  if (!isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl border text-xs max-w-sm transition-all duration-300">
          <div className="p-2 rounded-xl flex items-center gap-2 bg-slate-900 border border-slate-700 shadow-2xl">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span className="text-slate-100 font-medium">{toast.text}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white mr-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Global Header */}
      <Header
        stats={stats}
        onControlEngine={handleControlEngine}
        onUpdatePrices={handleUpdatePricesNow}
        onBroadcastStatic={handleBroadcastStatic}
        onLogout={handleLogout}
        username={username}
        isUpdatingPrices={isUpdatingPrices}
      />

      {/* Main App Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-cyan-400 shadow-sm border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Content Rendering */}
        <main className="transition-opacity duration-200">
          {activeTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              settings={settings}
              recentMessages={messages}
              recentLogs={logs}
              onNavigateTab={setActiveTab}
              onUpdatePrices={handleUpdatePricesNow}
              onBroadcastStatic={handleBroadcastStatic}
              onTestBot={handleTestBot}
              onDeleteMessage={handleDeleteMessage}
              isUpdatingPrices={isUpdatingPrices}
            />
          )}

          {activeTab === 'sources' && (
            <SourceChannelsTab
              sources={sources}
              destinations={destinations}
              onAddSource={handleAddSource}
              onUpdateSource={handleUpdateSource}
              onDeleteSource={handleDeleteSource}
              onTestSource={api.testSource}
            />
          )}

          {activeTab === 'destinations' && (
            <DestinationChannelsTab
              destinations={destinations}
              onAddDestination={handleAddDestination}
              onUpdateDestination={handleUpdateDestination}
              onDeleteDestination={handleDeleteDestination}
              onTestDestination={api.testDestination}
              onTestSendDestination={api.testSendDestination}
            />
          )}

          {activeTab === 'forwarder' && (
            <MessageForwarderTab
              settings={settings}
              sources={sources}
              onSaveSettings={handleSaveSettings}
              onTriggerSimulate={api.simulateForward}
            />
          )}

          {activeTab === 'static' && (
            <StaticMessageTab
              settings={settings}
              destinations={destinations}
              onSaveSettings={handleSaveSettings}
              onBroadcast={api.broadcastStaticMessage}
            />
          )}

          {activeTab === 'prices' && (
            <PricesTab
              settings={settings}
              destinations={destinations}
              latestPrices={latestPrices}
              formattedMessage={formattedMessage}
              isUpdatingPrices={isUpdatingPrices}
              onUpdatePricesNow={handleUpdatePricesNow}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'deduplication' && (
            <DeduplicationTab
              messages={messages}
              onRetryMessage={handleRetryMessage}
              onDeleteMessage={handleDeleteMessage}
              onClearAllMessages={handleClearAllMessages}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab
              logs={logs}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onTestBot={handleTestBot}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            MZ Telegram Automation © {new Date().getFullYear()} — نظام ناقل قنوات تيليجرام الذكي
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span>محرك النقل: {stats?.engineStatus === 'running' ? '🟢 نشط' : '⏸️ متوقف'}</span>
            <span>·</span>
            <span>نقطة الفحص: /api/health</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { cleanMessageText, cleanMediaCaption } from './server/cleaner.ts';
import { updateAllPrices, formatPriceMessage } from './server/prices.ts';
import { telegramBot } from './server/telegram.ts';
import { forwarder } from './server/forwarder.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// CORS & Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.substring(7).trim();
  if (!db.validateSession(token)) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
  }

  next();
}

// ============================================================================
// Auth Endpoints
// ============================================================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const admin = db.getAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'لم يتم العثور على حساب مشرف' });
  }

  if (admin.username !== username || !db.verifyPassword(password)) {
    db.addLog('warning', 'auth', `محاولة تسجيل دخول فاشلة للمستخدم: ${username}`);
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

  const token = db.createSession(username);
  db.addLog('info', 'auth', `تم تسجيل الدخول بنجاح للمشرف: ${username}`);
  return res.json({ token, username, success: true });
});

app.get('/api/auth/me', authMiddleware, (_req, res) => {
  const admin = db.getAdmin();
  return res.json({
    username: admin?.username || 'admin',
    createdAt: admin?.createdAt,
    lastLogin: admin?.lastLogin,
  });
});

app.post('/api/auth/update-credentials', authMiddleware, (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ error: 'كلمة المرور الحالية مطلوبة للتأكيد' });
  }

  if (!db.verifyPassword(currentPassword)) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }

  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل' });
  }

  const ok = db.updateAdmin(username || 'admin', newPassword);
  if (ok) {
    db.addLog('info', 'auth', 'تم تغيير بيانات المشرف وكلمة المرور بنجاح');
    return res.json({ success: true, message: 'تم التحديث بنجاح' });
  }
  return res.status(500).json({ error: 'فشل التحديث' });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = (req.headers.authorization || '').substring(7).trim();
  db.revokeSession(token);
  return res.json({ success: true });
});

// ============================================================================
// System Status & Settings Endpoints
// ============================================================================
app.get('/api/stats', authMiddleware, (_req, res) => {
  const stats = db.getStats();
  return res.json(stats);
});

app.get('/api/settings', authMiddleware, (_req, res) => {
  const settings = db.getSettings();
  // Mask sensitive credentials partially for UI display
  const maskedToken = settings.telegramBotToken
    ? `${settings.telegramBotToken.slice(0, 6)}••••••••${settings.telegramBotToken.slice(-4)}`
    : '';
  return res.json({
    ...settings,
    telegramBotTokenMasked: maskedToken,
    hasBotToken: Boolean(settings.telegramBotToken),
    hasApiCredentials: Boolean(settings.telegramApiId && settings.telegramApiHash),
  });
});

app.post('/api/settings', authMiddleware, (req, res) => {
  const updates = req.body;
  // If user passed a masked token or didn't change it, don't overwrite with dots
  if (updates.telegramBotToken && updates.telegramBotToken.includes('••••')) {
    delete updates.telegramBotToken;
  }
  const saved = db.updateSettings(updates);
  return res.json(saved);
});

app.post('/api/engine/control', authMiddleware, (req, res) => {
  const { action } = req.body; // 'start' | 'pause' | 'resume'
  if (action === 'pause') {
    db.updateSettings({ engineStatus: 'paused' });
    db.addLog('warning', 'system', 'تم إيقاف محرك النقل مؤقتًا بواسطة المشرف');
  } else if (action === 'start' || action === 'resume') {
    db.updateSettings({ engineStatus: 'running' });
    db.addLog('info', 'system', 'تم تشغيل محرك النقل التلقائي');
  }
  return res.json({ status: db.getSettings().engineStatus });
});

// ============================================================================
// Source Channels Endpoints
// ============================================================================
app.get('/api/sources', authMiddleware, (_req, res) => {
  return res.json(db.getSourceChannels());
});

app.post('/api/sources', authMiddleware, (req, res) => {
  try {
    const { name, username, telegramId, priority, targetDestinations, isActive } = req.body;
    if (!name || !username) {
      return res.status(400).json({ error: 'اسم القناة والمعرّف أو الرابط مطلوبان' });
    }

    const created = db.addSourceChannel({
      name: name.trim(),
      username: username.trim(),
      telegramId: telegramId ? telegramId.trim() : undefined,
      priority: Number(priority) || 1,
      targetDestinations: Array.isArray(targetDestinations) ? targetDestinations : [],
      isActive: isActive !== false,
      status: 'connected',
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'فشل إضافة القناة' });
  }
});

app.put('/api/sources/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const updated = db.updateSourceChannel(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'القناة غير موجودة' });
  }
  return res.json(updated);
});

app.delete('/api/sources/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteSourceChannel(id);
  if (!deleted) {
    return res.status(404).json({ error: 'القناة غير موجودة' });
  }
  return res.json({ success: true });
});

app.post('/api/sources/:id/test', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const source = db.getSourceChannels().find((c) => c.id === id);
  if (!source) return res.status(404).json({ error: 'القناة غير موجودة' });

  const isSample = source.id.includes('sample') || source.name.includes('نموذج');
  const target = source.username || source.telegramId || '';
  const testResult = await telegramBot.testSourceChannel(target, source.name, isSample);
  return res.json({
    channel: source.name,
    identifier: source.username,
    ...testResult,
  });
});

// ============================================================================
// Destination Channels Endpoints
// ============================================================================
app.get('/api/destinations', authMiddleware, (_req, res) => {
  return res.json(db.getDestinationChannels());
});

app.post('/api/destinations', authMiddleware, (req, res) => {
  try {
    const { name, username, telegramId, priority, isActive } = req.body;
    if (!name || !username) {
      return res.status(400).json({ error: 'اسم القناة والمعرّف أو الرابط مطلوبان' });
    }

    const created = db.addDestinationChannel({
      name: name.trim(),
      username: username.trim(),
      telegramId: telegramId ? telegramId.trim() : undefined,
      priority: Number(priority) || 1,
      isActive: isActive !== false,
      lastStatus: 'idle',
    });

    // Check if auto static message on new channel is enabled
    const settings = db.getSettings();
    if (settings.staticMessageAutoOnNewChannel && settings.staticMessageEnabled && settings.staticMessageText) {
      telegramBot.dispatchStaticMessage(created, settings.staticMessageText, settings.staticMessagePin).catch(console.error);
    }

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'فشل إضافة القناة' });
  }
});

app.put('/api/destinations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const updated = db.updateDestinationChannel(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'القناة غير موجودة' });
  }
  return res.json(updated);
});

app.delete('/api/destinations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteDestinationChannel(id);
  if (!deleted) {
    return res.status(404).json({ error: 'القناة غير موجودة' });
  }
  return res.json({ success: true });
});

app.post('/api/destinations/:id/test', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const dest = db.getDestinationChannels().find((d) => d.id === id);
  if (!dest) return res.status(404).json({ error: 'القناة غير موجودة' });

  const isSample = dest.id.includes('sample') || dest.name.includes('نموذج') || dest.username.includes('sample');
  const targetId = dest.username || dest.telegramId || '';
  const testResult = await telegramBot.testDestinationChannel(targetId, dest.name, isSample);
  return res.json(testResult);
});

app.post('/api/destinations/:id/test-send', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const dest = db.getDestinationChannels().find((d) => d.id === id);
  if (!dest) return res.status(404).json({ error: 'القناة غير موجودة' });

  const isSample = dest.id.includes('sample') || dest.name.includes('نموذج') || dest.username.includes('sample');
  const targetId = dest.username || dest.telegramId || '';
  const testMsg = `🔔 <b>رسالة اختبار الاتصال</b>\n\nنظام <b>MZ Telegram Automation</b> متصل بالقناة بنجاح والصلاحيات جاهزة.\nالوقت: ${new Date().toLocaleTimeString('ar-SA')}`;
  const result = await telegramBot.sendTestMessage(targetId, testMsg, isSample);

  if (result.ok) {
    db.updateDestinationChannel(dest.id, {
      lastDispatchedAt: new Date().toISOString(),
      lastStatus: 'success',
      lastErrorMessage: undefined,
    });
    db.addLog('success', 'telegram', `تم إرسال رسالة اختبار بنجاح إلى ${dest.name}`);
  } else {
    db.updateDestinationChannel(dest.id, {
      lastStatus: 'failed',
      lastErrorMessage: result.error,
    });
    db.addLog('error', 'telegram', `فشل إرسال رسالة اختبار إلى ${dest.name}`, result.error);
  }

  return res.json(result);
});

// ============================================================================
// Direct Channel Diagnostic Endpoint
// ============================================================================
app.post('/api/telegram/test-channel', authMiddleware, async (req, res) => {
  const { type, identifier, name } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'يرجى إدخال معرّف أو رابط القناة' });
  }

  const isSample = identifier.includes('sample') || (name && name.includes('نموذج'));
  if (type === 'destination') {
    const result = await telegramBot.testDestinationChannel(identifier, name, isSample);
    return res.json(result);
  } else {
    const result = await telegramBot.testSourceChannel(identifier, name, isSample);
    return res.json(result);
  }
});

// ============================================================================
// Telegram Bot Credentials Check
// ============================================================================
app.post('/api/telegram/test-bot', authMiddleware, async (_req, res) => {
  const result = await telegramBot.getMe();
  return res.json(result);
});

// ============================================================================
// Live Prices Endpoints
// ============================================================================
app.get('/api/prices/current', authMiddleware, (_req, res) => {
  const prices = db.getLatestPrices();
  const formatted = formatPriceMessage();
  return res.json({ prices, formatted });
});

app.post('/api/prices/update-now', authMiddleware, async (_req, res) => {
  const result = await updateAllPrices();
  const formatted = formatPriceMessage();
  const settings = db.getSettings();

  // If auto-update in channels is active, push update to target destination channels
  const channelsUpdated: Array<{ id: string; name: string; ok: boolean; error?: string }> = [];
  if (settings.pricesMasterEnabled) {
    const destinations = db.getDestinationChannels().filter((d) => d.isActive);
    const targetDestinations = (settings.pricesDestinations && settings.pricesDestinations.length > 0)
      ? destinations.filter((d) => settings.pricesDestinations.includes(d.id))
      : destinations;

    for (const channel of targetDestinations) {
      if (settings.telegramBotToken) {
        const updateRes = await telegramBot.updatePricesInChannel(channel, formatted);
        channelsUpdated.push({ id: channel.id, name: channel.name, ok: updateRes.ok, error: updateRes.error });
      } else {
        channelsUpdated.push({ id: channel.id, name: channel.name, ok: true });
      }
    }
  }

  db.addLog('info', 'prices', 'تم تحديث أسعار الذهب والبيتكوين يدويًا', `تم التحديث في ${channelsUpdated.length} قناة`);
  return res.json({ ...result, formatted, channelsUpdated });
});

// ============================================================================
// Static Message Endpoints
// ============================================================================
app.post('/api/static-message/broadcast', authMiddleware, async (req, res) => {
  const { text, pin, channelIds } = req.body;
  const settings = db.getSettings();
  const messageText = text || settings.staticMessageText;
  const shouldPin = pin !== undefined ? pin : settings.staticMessagePin;

  if (!messageText) {
    return res.status(400).json({ error: 'نص الرسالة الثابتة فارغ' });
  }

  const allDestinations = db.getDestinationChannels().filter((d) => d.isActive);
  const targets = Array.isArray(channelIds) && channelIds.length > 0
    ? allDestinations.filter((d) => channelIds.includes(d.id))
    : allDestinations;

  const results: Array<{ id: string; name: string; ok: boolean; error?: string }> = [];

  for (const channel of targets) {
    if (settings.telegramBotToken) {
      const resSend = await telegramBot.dispatchStaticMessage(channel, messageText, shouldPin);
      results.push({ id: channel.id, name: channel.name, ok: resSend.ok, error: resSend.error });
    } else {
      // Simulation mode
      results.push({ id: channel.id, name: channel.name, ok: true });
    }
  }

  db.addLog('info', 'system', `تم نشر الرسالة الثابتة إلى ${results.filter((r) => r.ok).length} قناة`);
  return res.json({ success: true, results });
});

// ============================================================================
// Message Processing & Deduplication Sandbox / Test
// ============================================================================
app.post('/api/cleaner/test', authMiddleware, (req, res) => {
  const { text, type, options } = req.body;
  const settings = db.getSettings();
  const effectiveOpts = {
    removePlainUrls: options?.removePlainUrls ?? (type === 'caption' ? settings.removeUrlsCaptions : settings.removeUrlsText),
    cleanHyperlinksMode: options?.cleanHyperlinksMode ?? settings.cleanHyperlinksMode,
    removeTelegramLinks: true,
  };

  const result = type === 'caption' ? cleanMediaCaption(text, effectiveOpts) : cleanMessageText(text, effectiveOpts);
  return res.json(result);
});

app.post('/api/forwarder/simulate', authMiddleware, async (req, res) => {
  const { sourceChannelId, sourceMessageId, text, caption, messageType } = req.body;
  if (!sourceChannelId) {
    return res.status(400).json({ error: 'يرجى اختيار قناة المصدر' });
  }

  const result = await forwarder.processMessage({
    sourceChannelId,
    sourceMessageId: Number(sourceMessageId) || Math.floor(Date.now() / 1000) % 100000,
    messageType: messageType || 'text',
    text,
    caption,
  });

  return res.json(result);
});

app.get('/api/forwarder/logs', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || '100'), 10), 500);
  const items = db.getForwardedMessages(limit);
  return res.json(items);
});

app.post('/api/forwarder/retry/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const result = await forwarder.retryFailedMessage(id);
  return res.json(result);
});

app.delete('/api/forwarder/logs/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const ok = db.deleteForwardedMessage(id);
  if (!ok) {
    return res.status(404).json({ error: 'الخبر/الرسالة غير موجودة في السجل' });
  }
  return res.json({ success: true, message: 'تم حذف الخبر من السجل بنجاح' });
});

app.delete('/api/forwarder/logs', authMiddleware, (_req, res) => {
  db.clearForwardedMessages();
  return res.json({ success: true, message: 'تم مسح كامل السجل' });
});

// ============================================================================
// System Audit Logs
// ============================================================================
app.get('/api/logs', authMiddleware, (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || '100'), 10), 300);
  return res.json(db.getLogs(limit));
});

// Health check endpoint (for 24/7 monitoring services like UptimeRobot)
app.get('/api/health', (_req, res) => {
  const stats = db.getStats();
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    engineStatus: stats.engineStatus,
    activeSources: stats.activeSource,
    activeDestinations: stats.activeDest,
  });
});

// ============================================================================
// Background Scheduled Service (Prices Updater)
// ============================================================================
let priceIntervalHandle: NodeJS.Timeout | null = null;

function setupPriceUpdateScheduler() {
  if (priceIntervalHandle) {
    clearInterval(priceIntervalHandle);
  }

  const settings = db.getSettings();
  const minutes = Math.max(settings.pricesIntervalMinutes || 5, 1);
  const ms = minutes * 60 * 1000;

  priceIntervalHandle = setInterval(async () => {
    const currentSettings = db.getSettings();
    if (currentSettings.engineStatus === 'running' && currentSettings.pricesMasterEnabled) {
      try {
        await updateAllPrices();
        const formatted = formatPriceMessage();
        if (currentSettings.telegramBotToken) {
          const destinations = db.getDestinationChannels().filter((d) => d.isActive);
          const targets = (currentSettings.pricesDestinations && currentSettings.pricesDestinations.length > 0)
            ? destinations.filter((d) => currentSettings.pricesDestinations.includes(d.id))
            : destinations;

          for (const ch of targets) {
            await telegramBot.updatePricesInChannel(ch, formatted);
          }
        }
      } catch (e) {
        console.error('Background price update error:', e);
      }
    }
  }, ms);
}

// Initial price fetch on boot
updateAllPrices().catch(console.error);
setupPriceUpdateScheduler();

// ============================================================================
// Vite Middleware / Static Serve
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MZ Telegram Automation Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

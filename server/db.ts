import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin?: string;
}

export interface SourceChannel {
  id: string;
  name: string;
  username: string; // e.g. @gold_news or t.me/gold_news or numeric ID
  telegramId?: string;
  isActive: boolean;
  priority: number;
  targetDestinations: string[]; // destination channel IDs
  lastMessageId?: number;
  lastMessageAt?: string;
  lastErrorMessage?: string;
  status: 'connected' | 'error' | 'pending' | 'paused';
  createdAt: string;
}

export interface DestinationChannel {
  id: string;
  name: string;
  username: string; // e.g. @my_channel or -100123456789
  telegramId?: string;
  isActive: boolean;
  priority: number;
  lastDispatchedAt?: string;
  lastStatus: 'success' | 'failed' | 'idle' | 'testing';
  currentPricesMsgId?: number;
  currentStaticMsgId?: number;
  lastErrorMessage?: string;
  createdAt: string;
}

export interface ForwardedMessage {
  id: string;
  sourceChannelId: string;
  sourceChannelName: string;
  sourceMessageId: number;
  destinationChannelId: string;
  destinationChannelName: string;
  messageType: 'text' | 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'album';
  contentPreview: string;
  hasMedia: boolean;
  linksRemovedCount: number;
  status: 'success' | 'failed' | 'pending';
  errorDetail?: string;
  sentMessageId?: number;
  retries: number;
  createdAt: string;
}

export interface PriceRecord {
  asset: 'XAU' | 'BTC';
  price: number;
  previousPrice?: number;
  direction: 'up' | 'down' | 'neutral';
  changePercent: number;
  source: string;
  timestamp: string;
  unit: string;
}

export interface SystemSettings {
  engineStatus: 'running' | 'paused';
  telegramBotToken: string;
  telegramApiId: string;
  telegramApiHash: string;
  telegramSessionString: string;
  removeUrlsText: boolean;
  removeUrlsCaptions: boolean;
  cleanHyperlinksMode: 'keep_text' | 'strip_all' | 'preserve';
  preserveMediaQuality: boolean;
  forwardEditedMessages: boolean;
  // Static message
  staticMessageText: string;
  staticMessageEnabled: boolean;
  staticMessagePin: boolean;
  staticMessageDestinations: string[];
  staticMessageAutoOnStart: boolean;
  staticMessageAutoOnNewChannel: boolean;
  // Prices
  pricesMasterEnabled: boolean;
  pricesGoldEnabled: boolean;
  pricesBtcEnabled: boolean;
  pricesIntervalMinutes: number;
  pricesTemplate: string;
  pricesDestinations: string[];
  pricesOrder: 'above_static' | 'below_static' | 'standalone';
  goldCurrency: string;
  goldUnit: string;
  btcCurrency: string;
  decimalsGold: number;
  decimalsBtc: number;
}

export interface AuditLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'forwarder' | 'prices' | 'auth' | 'telegram';
  message: string;
  details?: string;
  timestamp: string;
}

interface DatabaseSchema {
  admin: AdminUser | null;
  sessions: { [token: string]: { username: string; expiresAt: number } };
  settings: SystemSettings;
  sourceChannels: SourceChannel[];
  destinationChannels: DestinationChannel[];
  forwardedMessages: ForwardedMessage[];
  latestPrices: {
    gold?: PriceRecord;
    btc?: PriceRecord;
  };
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'storage.json');

const DEFAULT_SETTINGS: SystemSettings = {
  engineStatus: 'running',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramApiId: process.env.TELEGRAM_API_ID || '',
  telegramApiHash: process.env.TELEGRAM_API_HASH || '',
  telegramSessionString: process.env.TELEGRAM_SESSION_STRING || '',
  removeUrlsText: true,
  removeUrlsCaptions: true,
  cleanHyperlinksMode: 'keep_text',
  preserveMediaQuality: true,
  forwardEditedMessages: false,
  staticMessageText: `📢 مرحبًا بكم في القناة الرسمية\n\nنقدم لكم تغطية فورية وحصرية لأحدث الأخبار والتحليلات الاقتصادية على مدار الساعة.\n\n🌐 للمزيد من المعلومات أو التواصل: https://t.me/example`,
  staticMessageEnabled: true,
  staticMessagePin: true,
  staticMessageDestinations: [],
  staticMessageAutoOnStart: false,
  staticMessageAutoOnNewChannel: true,
  pricesMasterEnabled: true,
  pricesGoldEnabled: true,
  pricesBtcEnabled: true,
  pricesIntervalMinutes: 5,
  pricesTemplate: `⚡ الذهب XAU/USD: {gold_price}$ | {gold_arrow}\n₿ البيتكوين BTC/USD: {btc_price}$ | {btc_arrow}\nآخر تحديث: {updated_at}`,
  pricesDestinations: [],
  pricesOrder: 'above_static',
  goldCurrency: 'USD',
  goldUnit: 'أونصة تروي',
  btcCurrency: 'USD',
  decimalsGold: 2,
  decimalsBtc: 0,
};

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
    this.ensureInitialData();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          admin: parsed.admin || null,
          sessions: parsed.sessions || {},
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          sourceChannels: parsed.sourceChannels || [],
          destinationChannels: parsed.destinationChannels || [],
          forwardedMessages: parsed.forwardedMessages || [],
          latestPrices: parsed.latestPrices || {},
          auditLogs: parsed.auditLogs || [],
        };
      } catch (err) {
        console.error('Failed to parse database file, resetting to defaults:', err);
      }
    }
    return {
      admin: null,
      sessions: {},
      settings: { ...DEFAULT_SETTINGS },
      sourceChannels: [],
      destinationChannels: [],
      forwardedMessages: [],
      latestPrices: {},
      auditLogs: [],
    };
  }

  public save() {
    try {
      this.ensureDirectory();
      // Keep logs limited to last 300 entries to prevent bloat
      if (this.data.auditLogs.length > 300) {
        this.data.auditLogs = this.data.auditLogs.slice(-300);
      }
      // Keep forwarded message ledger to last 5000 items
      if (this.data.forwardedMessages.length > 5000) {
        this.data.forwardedMessages = this.data.forwardedMessages.slice(-5000);
      }
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  private ensureInitialData() {
    // If no admin exists yet, initialize default admin with secure salt
    if (!this.data.admin) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('admin1234', salt, 64).toString('hex');
      this.data.admin = {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
      };
      this.addLog('info', 'auth', 'تم تهيئة حساب المدير الأول بنجاح (اسم المستخدم: admin)');
    }

    // Add initial demonstration channels if none exist to make dashboard immediately rich and informative
    if (this.data.sourceChannels.length === 0) {
      this.data.sourceChannels.push({
        id: 'src_gold_sample',
        name: 'قناة أخبار الذهب والعملات (نموذج)',
        username: '@GoldNewsArabic',
        telegramId: '-1001552233441',
        isActive: true,
        priority: 1,
        targetDestinations: ['dest_vip_sample'],
        lastMessageId: 1042,
        lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'connected',
        createdAt: new Date().toISOString(),
      });
      this.data.sourceChannels.push({
        id: 'src_crypto_sample',
        name: 'إشارات وتحليلات الكريبتو (نموذج)',
        username: '@CryptoDailyArabic',
        telegramId: '-1001889922331',
        isActive: true,
        priority: 2,
        targetDestinations: ['dest_vip_sample', 'dest_news_sample'],
        lastMessageId: 859,
        lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
        status: 'connected',
        createdAt: new Date().toISOString(),
      });
    }

    if (this.data.destinationChannels.length === 0) {
      this.data.destinationChannels.push({
        id: 'dest_vip_sample',
        name: 'قناة VIP الرئيسية للمتابعين',
        username: '@MZ_Telegram_VIP',
        telegramId: '-1002998877665',
        isActive: true,
        priority: 1,
        lastDispatchedAt: new Date(Date.now() - 600000).toISOString(),
        lastStatus: 'success',
        currentPricesMsgId: 201,
        currentStaticMsgId: 105,
        createdAt: new Date().toISOString(),
      });
      this.data.destinationChannels.push({
        id: 'dest_news_sample',
        name: 'قناة الأخبار السريعة العامة',
        username: '@MZ_News_Channel',
        telegramId: '-1002112233445',
        isActive: true,
        priority: 2,
        lastDispatchedAt: new Date(Date.now() - 1200000).toISOString(),
        lastStatus: 'success',
        currentPricesMsgId: 144,
        createdAt: new Date().toISOString(),
      });
    }

    this.save();
  }

  // --- Auth Methods ---
  public getAdmin(): AdminUser | null {
    return this.data.admin;
  }

  public updateAdmin(username: string, newPassword?: string): boolean {
    if (!this.data.admin) return false;
    this.data.admin.username = username;
    if (newPassword && newPassword.length >= 6) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
      this.data.admin.passwordHash = hash;
      this.data.admin.salt = salt;
    }
    this.save();
    return true;
  }

  public verifyPassword(password: string): boolean {
    if (!this.data.admin) return false;
    const testHash = crypto.scryptSync(password, this.data.admin.salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(this.data.admin.passwordHash, 'hex'));
  }

  public createSession(username: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    this.data.sessions[token] = { username, expiresAt };
    if (this.data.admin) {
      this.data.admin.lastLogin = new Date().toISOString();
    }
    this.save();
    return token;
  }

  public validateSession(token: string): boolean {
    if (!token) return false;
    const session = this.data.sessions[token];
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[token];
      this.save();
      return false;
    }
    return true;
  }

  public revokeSession(token: string) {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    return { ...this.data.settings };
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    this.addLog('info', 'system', 'تم تحديث إعدادات النظام');
    return this.data.settings;
  }

  // --- Source Channels ---
  public getSourceChannels(): SourceChannel[] {
    return [...this.data.sourceChannels].sort((a, b) => a.priority - b.priority);
  }

  public addSourceChannel(channel: Omit<SourceChannel, 'id' | 'createdAt'>): SourceChannel {
    // Prevent duplicate channel addition
    const cleanUsername = channel.username.trim().toLowerCase();
    const existing = this.data.sourceChannels.find(
      (c) => c.username.trim().toLowerCase() === cleanUsername || (channel.telegramId && c.telegramId === channel.telegramId)
    );
    if (existing) {
      throw new Error(`القناة (${channel.username}) موجودة مسبقًا في قائمة قنوات المصدر`);
    }

    const newChannel: SourceChannel = {
      ...channel,
      id: `src_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.sourceChannels.push(newChannel);
    this.save();
    this.addLog('info', 'forwarder', `تمت إضافة قناة مصدر جديدة: ${newChannel.name} (${newChannel.username})`);
    return newChannel;
  }

  public updateSourceChannel(id: string, updates: Partial<SourceChannel>): SourceChannel | null {
    const idx = this.data.sourceChannels.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.sourceChannels[idx] = { ...this.data.sourceChannels[idx], ...updates };
    this.save();
    return this.data.sourceChannels[idx];
  }

  public deleteSourceChannel(id: string): boolean {
    const initialLen = this.data.sourceChannels.length;
    this.data.sourceChannels = this.data.sourceChannels.filter((c) => c.id !== id);
    if (this.data.sourceChannels.length !== initialLen) {
      this.save();
      this.addLog('warning', 'forwarder', `تم حذف قناة المصدر: ${id}`);
      return true;
    }
    return false;
  }

  // --- Destination Channels ---
  public getDestinationChannels(): DestinationChannel[] {
    return [...this.data.destinationChannels].sort((a, b) => a.priority - b.priority);
  }

  public addDestinationChannel(channel: Omit<DestinationChannel, 'id' | 'createdAt'>): DestinationChannel {
    const cleanUsername = channel.username.trim().toLowerCase();
    const existing = this.data.destinationChannels.find(
      (c) => c.username.trim().toLowerCase() === cleanUsername || (channel.telegramId && c.telegramId === channel.telegramId)
    );
    if (existing) {
      throw new Error(`القناة (${channel.username}) موجودة مسبقًا في قائمة قنوات الواجهات`);
    }

    const newChannel: DestinationChannel = {
      ...channel,
      id: `dest_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.destinationChannels.push(newChannel);
    this.save();
    this.addLog('info', 'telegram', `تمت إضافة قناة واجهة جديدة: ${newChannel.name} (${newChannel.username})`);
    return newChannel;
  }

  public updateDestinationChannel(id: string, updates: Partial<DestinationChannel>): DestinationChannel | null {
    const idx = this.data.destinationChannels.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.destinationChannels[idx] = { ...this.data.destinationChannels[idx], ...updates };
    this.save();
    return this.data.destinationChannels[idx];
  }

  public deleteDestinationChannel(id: string): boolean {
    const initialLen = this.data.destinationChannels.length;
    this.data.destinationChannels = this.data.destinationChannels.filter((c) => c.id !== id);
    if (this.data.destinationChannels.length !== initialLen) {
      this.save();
      this.addLog('warning', 'telegram', `تم حذف قناة الواجهة: ${id}`);
      return true;
    }
    return false;
  }

  // --- Forwarded Messages (Strict Deduplication Ledger) ---
  public isMessageAlreadyForwarded(sourceChannelId: string, sourceMessageId: number, destinationChannelId: string): boolean {
    return this.data.forwardedMessages.some(
      (m) =>
        m.sourceChannelId === sourceChannelId &&
        m.sourceMessageId === sourceMessageId &&
        m.destinationChannelId === destinationChannelId &&
        m.status === 'success'
    );
  }

  public recordForwardAttempt(record: Omit<ForwardedMessage, 'id' | 'createdAt'>): ForwardedMessage {
    // Check if duplicate already recorded
    const existingIndex = this.data.forwardedMessages.findIndex(
      (m) =>
        m.sourceChannelId === record.sourceChannelId &&
        m.sourceMessageId === record.sourceMessageId &&
        m.destinationChannelId === record.destinationChannelId
    );

    if (existingIndex >= 0) {
      // Update existing record
      const updated: ForwardedMessage = {
        ...this.data.forwardedMessages[existingIndex],
        ...record,
        retries: this.data.forwardedMessages[existingIndex].retries + 1,
      };
      this.data.forwardedMessages[existingIndex] = updated;
      this.save();
      return updated;
    }

    const newRecord: ForwardedMessage = {
      ...record,
      id: `fwd_${crypto.randomUUID().slice(0, 10)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.forwardedMessages.unshift(newRecord);
    this.save();
    return newRecord;
  }

  public getForwardedMessages(limit = 100): ForwardedMessage[] {
    return this.data.forwardedMessages.slice(0, limit);
  }

  public deleteForwardedMessage(id: string): boolean {
    const initialLen = this.data.forwardedMessages.length;
    this.data.forwardedMessages = this.data.forwardedMessages.filter((m) => m.id !== id);
    if (this.data.forwardedMessages.length !== initialLen) {
      this.save();
      this.addLog('warning', 'forwarder', `تم حذف رسالة/خبر من السجل: ${id}`);
      return true;
    }
    return false;
  }

  public clearForwardedMessages(): boolean {
    this.data.forwardedMessages = [];
    this.save();
    this.addLog('warning', 'forwarder', 'تم مسح كامل سجل الرسائل والمنشورات المنقولة');
    return true;
  }

  // --- Prices Storage ---
  public getLatestPrices() {
    return this.data.latestPrices;
  }

  public savePrice(asset: 'XAU' | 'BTC', price: number, source: string, unit: string): PriceRecord {
    const prev = asset === 'XAU' ? this.data.latestPrices.gold : this.data.latestPrices.btc;
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    let changePercent = 0;

    if (prev && prev.price > 0) {
      if (price > prev.price) direction = 'up';
      else if (price < prev.price) direction = 'down';
      changePercent = parseFloat((((price - prev.price) / prev.price) * 100).toFixed(2));
    }

    const record: PriceRecord = {
      asset,
      price,
      previousPrice: prev ? prev.price : price,
      direction,
      changePercent,
      source,
      timestamp: new Date().toISOString(),
      unit,
    };

    if (asset === 'XAU') {
      this.data.latestPrices.gold = record;
    } else {
      this.data.latestPrices.btc = record;
    }

    this.save();
    return record;
  }

  // --- Audit Logs ---
  public addLog(level: 'info' | 'warning' | 'error' | 'success', category: 'system' | 'forwarder' | 'prices' | 'auth' | 'telegram', message: string, details?: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    this.save();
  }

  public getLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public getStats() {
    const totalSource = this.data.sourceChannels.length;
    const totalDest = this.data.destinationChannels.length;
    const activeSource = this.data.sourceChannels.filter((c) => c.isActive).length;
    const activeDest = this.data.destinationChannels.filter((c) => c.isActive).length;
    const successForwards = this.data.forwardedMessages.filter((m) => m.status === 'success').length;
    const failedForwards = this.data.forwardedMessages.filter((m) => m.status === 'failed').length;

    return {
      totalSource,
      totalDest,
      activeSource,
      activeDest,
      successForwards,
      failedForwards,
      engineStatus: this.data.settings.engineStatus,
      lastGoldPrice: this.data.latestPrices.gold,
      lastBtcPrice: this.data.latestPrices.btc,
      lastForwarded: this.data.forwardedMessages[0] || null,
    };
  }
}

export const db = new DatabaseManager();

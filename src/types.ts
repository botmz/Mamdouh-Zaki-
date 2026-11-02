export interface AdminUser {
  username: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface SourceChannel {
  id: string;
  name: string;
  username: string;
  telegramId?: string;
  isActive: boolean;
  priority: number;
  targetDestinations: string[];
  lastMessageId?: number;
  lastMessageAt?: string;
  lastErrorMessage?: string;
  status: 'connected' | 'error' | 'pending' | 'paused';
  createdAt: string;
}

export interface DestinationChannel {
  id: string;
  name: string;
  username: string;
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
  telegramBotToken?: string;
  telegramBotTokenMasked?: string;
  hasBotToken?: boolean;
  telegramApiId?: string;
  telegramApiHash?: string;
  telegramSessionString?: string;
  hasApiCredentials?: boolean;
  removeUrlsText: boolean;
  removeUrlsCaptions: boolean;
  cleanHyperlinksMode: 'keep_text' | 'strip_all' | 'preserve';
  preserveMediaQuality: boolean;
  forwardEditedMessages: boolean;
  staticMessageText: string;
  staticMessageEnabled: boolean;
  staticMessagePin: boolean;
  staticMessageDestinations: string[];
  staticMessageAutoOnStart: boolean;
  staticMessageAutoOnNewChannel: boolean;
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

export interface SystemStats {
  totalSource: number;
  totalDest: number;
  activeSource: number;
  activeDest: number;
  successForwards: number;
  failedForwards: number;
  engineStatus: 'running' | 'paused';
  lastGoldPrice?: PriceRecord;
  lastBtcPrice?: PriceRecord;
  lastForwarded?: ForwardedMessage | null;
}

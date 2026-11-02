/**
 * MZ Telegram Automation — محرك جلب وتنسيق أسعار الذهب والبيتكوين المباشرة
 * يدعم Binance و CoinGecko للبيتكوين، و Yahoo Finance / Metals API للذهب
 * مع حساب اتجاه السعر (🟢 ▲ / 🔴 ▼ / ⚪ ▬) والتحديث التلقائي للرسائل
 */

import { db, PriceRecord } from './db.ts';

export interface PriceFetchResult {
  gold?: PriceRecord;
  btc?: PriceRecord;
  isStale?: boolean;
  error?: string;
  sourceStatus: {
    gold: 'online' | 'cached' | 'error';
    btc: 'online' | 'cached' | 'error';
    lastSuccess: string;
  };
}

let lastSuccessfulUpdate = new Date().toISOString();

export async function fetchLiveBitcoinPrice(): Promise<{ price: number; source: string }> {
  // 1. Try Binance Public Ticker
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
      headers: { 'User-Agent': 'MZ-Telegram-Automation/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.price);
      if (!isNaN(price) && price > 1000) {
        return { price, source: 'Binance Live (BTC/USDT)' };
      }
    }
  } catch (err) {
    console.warn('Binance price fetch error, falling back to CoinGecko:', err);
  }

  // 2. Try CoinGecko Public API
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      headers: { 'User-Agent': 'MZ-Telegram-Automation/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.bitcoin?.usd);
      if (!isNaN(price) && price > 1000) {
        return { price, source: 'CoinGecko Live (BTC/USD)' };
      }
    }
  } catch (err) {
    console.warn('CoinGecko price fetch error:', err);
  }

  // Fallback to last known good price from DB
  const latest = db.getLatestPrices();
  if (latest.btc && latest.btc.price > 0) {
    return { price: latest.btc.price, source: 'مخزن محلياً (آخر سعر متاح)' };
  }

  // Base fallback if completely fresh and no network
  return { price: 78000, source: 'سعر مرجعي أولي' };
}

export async function fetchLiveGoldPrice(): Promise<{ price: number; source: string }> {
  const settings = db.getSettings();

  // If user provided a custom Gold API key (e.g. metals.dev)
  if (process.env.GOLD_API_KEY && process.env.GOLD_API_SOURCE === 'metals_dev') {
    try {
      const res = await fetch(`https://api.metals.dev/v1/latest?api_key=${process.env.GOLD_API_KEY}&currency=USD&unit=toz`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.metals?.gold);
        if (!isNaN(price) && price > 500) {
          return { price, source: 'Metals.dev (XAU/USD)' };
        }
      }
    } catch (err) {
      console.warn('Metals.dev fetch failed, trying public sources:', err);
    }
  }

  // Public High-Reliability Yahoo Finance Gold Futures (GC=F spot equivalent)
  try {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice || meta?.chartPreviousClose;
      if (price && typeof price === 'number' && price > 500) {
        return { price: parseFloat(price.toFixed(2)), source: 'Yahoo Finance (Gold Front Spot XAU/USD)' };
      }
    }
  } catch (err) {
    console.warn('Yahoo Finance gold fetch failed:', err);
  }

  // Fallback to last known price
  const latest = db.getLatestPrices();
  if (latest.gold && latest.gold.price > 0) {
    return { price: latest.gold.price, source: 'مخزن محلياً (آخر سعر متاح)' };
  }

  return { price: 3890.50, source: 'سعر مرجعي أولي' };
}

export async function updateAllPrices(): Promise<PriceFetchResult> {
  const settings = db.getSettings();
  let goldRecord: PriceRecord | undefined;
  let btcRecord: PriceRecord | undefined;
  let goldStatus: 'online' | 'cached' | 'error' = 'online';
  let btcStatus: 'online' | 'cached' | 'error' = 'online';

  if (settings.pricesGoldEnabled) {
    try {
      const { price, source } = await fetchLiveGoldPrice();
      goldRecord = db.savePrice('XAU', price, source, settings.goldUnit || 'أونصة تروي');
      if (source.includes('مخزن')) goldStatus = 'cached';
    } catch (err) {
      goldStatus = 'error';
      db.addLog('error', 'prices', 'فشل في تحديث سعر الذهب', String(err));
    }
  }

  if (settings.pricesBtcEnabled) {
    try {
      const { price, source } = await fetchLiveBitcoinPrice();
      btcRecord = db.savePrice('BTC', price, source, 'دولار');
      if (source.includes('مخزن')) btcStatus = 'cached';
    } catch (err) {
      btcStatus = 'error';
      db.addLog('error', 'prices', 'فشل في تحديث سعر البيتكوين', String(err));
    }
  }

  lastSuccessfulUpdate = new Date().toISOString();

  return {
    gold: goldRecord || db.getLatestPrices().gold,
    btc: btcRecord || db.getLatestPrices().btc,
    sourceStatus: {
      gold: goldStatus,
      btc: btcStatus,
      lastSuccess: lastSuccessfulUpdate,
    },
  };
}

export function formatPriceMessage(): string {
  const settings = db.getSettings();
  const prices = db.getLatestPrices();

  const gold = prices.gold;
  const btc = prices.btc;

  const goldDecimals = settings.decimalsGold ?? 2;
  const btcDecimals = settings.decimalsBtc ?? 0;

  const goldPriceStr = gold
    ? gold.price.toLocaleString('en-US', { minimumFractionDigits: goldDecimals, maximumFractionDigits: goldDecimals })
    : '—';
  const btcPriceStr = btc
    ? btc.price.toLocaleString('en-US', { minimumFractionDigits: btcDecimals, maximumFractionDigits: btcDecimals })
    : '—';

  const getArrowSymbol = (record?: PriceRecord) => {
    if (!record) return '⚪ ▬';
    if (record.direction === 'up') return '🟢 ▲';
    if (record.direction === 'down') return '🔴 ▼';
    return '⚪ ▬';
  };

  const goldArrow = getArrowSymbol(gold);
  const btcArrow = getArrowSymbol(btc);

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const dateFormatted = now.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const updateTimestamp = `${dateFormatted} - ${timeFormatted}`;

  let template = settings.pricesTemplate;
  template = template
    .replace('{gold_price}', goldPriceStr)
    .replace('{gold_arrow}', goldArrow)
    .replace('{btc_price}', btcPriceStr)
    .replace('{btc_arrow}', btcArrow)
    .replace('{updated_at}', updateTimestamp);

  return template;
}

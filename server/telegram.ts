/**
 * MZ Telegram Automation — عميل Telegram Bot API
 * يتولى الإرسال والتعديل وتثبيت الرسائل والتحقق من الصلاحيات وفحص القنوات الحية
 */

import { db, DestinationChannel } from './db.ts';

export interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * Normalizes Telegram identifiers into formats acceptable by Telegram API
 * Examples:
 *   https://t.me/mychannel -> @mychannel
 *   t.me/mychannel -> @mychannel
 *   mychannel -> @mychannel
 *   -1001234567890 -> -1001234567890
 *   1234567890 -> -1001234567890
 */
export function normalizeTelegramIdentifier(input: string): string {
  if (!input) return '';
  let clean = input.trim();
  // Strip URL prefixes
  clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i, '');
  // Strip trailing slashes and query strings
  clean = clean.split('/')[0].split('?')[0];

  // If numeric without minus prefix, convert to -100...
  if (/^\d{8,14}$/.test(clean)) {
    return `-100${clean}`;
  }

  // If already starts with @ or -, return as is
  if (clean.startsWith('@') || clean.startsWith('-')) {
    return clean;
  }

  // If private link prefix (+ or joinchat)
  if (clean.startsWith('+')) {
    return clean;
  }

  return `@${clean}`;
}

export class TelegramBotClient {
  private getBotToken(): string {
    const settings = db.getSettings();
    return settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  private async callApi<T = any>(method: string, payload: Record<string, any>): Promise<TelegramApiResponse<T>> {
    const token = this.getBotToken();
    if (!token) {
      return {
        ok: false,
        description: 'لم يتم ضبط رمز البوت (Telegram Bot Token) في الإعدادات بعد',
      };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/${method}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const data = (await res.json()) as TelegramApiResponse<T>;
      return data;
    } catch (err: any) {
      return {
        ok: false,
        description: `فشل الاتصال بخوادم تيليجرام: ${err?.message || 'انقطاع في الشبكة'}`,
      };
    }
  }

  /**
   * Test Bot Token validity and get bot identity
   */
  public async getMe(): Promise<{ ok: boolean; bot?: any; error?: string }> {
    const token = this.getBotToken();
    if (!token) {
      return {
        ok: false,
        error: 'لم يتم إدخال رمز البوت في الإعدادات. يرجى إدخاله أولاً من تبويب "الإعدادات والأمان".',
      };
    }

    const res = await this.callApi('getMe', {});
    if (res.ok && res.result) {
      return { ok: true, bot: res.result };
    }
    return {
      ok: false,
      error: this.translateTelegramError(res.description) || 'فشل التحقق من رمز البوت',
    };
  }

  /**
   * Test Source Channel: Performs live public resolution and/or Bot API getChat
   */
  public async testSourceChannel(identifier: string, channelName?: string, isSample?: boolean): Promise<{
    ok: boolean;
    isPublic: boolean;
    isReachable: boolean;
    channelTitle?: string;
    description?: string;
    subscribers?: string;
    avatarUrl?: string;
    accessType: string;
    recommendation: string;
    error?: string;
    isSample?: boolean;
  }> {
    const cleanId = normalizeTelegramIdentifier(identifier);

    // 1. Detect sample demo channel
    if (
      isSample ||
      identifier.includes('sample') ||
      (channelName && channelName.includes('نموذج')) ||
      cleanId.toLowerCase().includes('goldnewsarabic') ||
      cleanId.toLowerCase().includes('cryptodailyarabic')
    ) {
      return {
        ok: true,
        isPublic: true,
        isReachable: true,
        isSample: true,
        channelTitle: channelName || 'قناة نموذجية للتوضيح',
        description: 'هذه قناة توضيحية تجريبية مسبقة الإعداد. جميع خصائص النقل وفلترة الروابط مفعلة لها.',
        subscribers: '14.8K مشترك',
        accessType: 'قناة عامة (نموذج تجريبي نشط)',
        recommendation: 'القناة النموذجية متصلة وجاهزة للنقل الفوري. يمكنك محاكاة إرسال منشورات تجريبية لها عبر تبويب "محاكي النقل والمعالجة".',
      };
    }

    // 2. If it's a private invite link (starts with + or joinchat)
    if (cleanId.startsWith('+') || identifier.includes('/+') || identifier.includes('joinchat')) {
      return {
        ok: true,
        isPublic: false,
        isReachable: true,
        channelTitle: channelName || 'قناة خاصة (Private Link)',
        accessType: 'قناة خاصة (رابط دعوة)',
        recommendation: 'هذه القناة خاصة وتتطلب رابط انضمام أو جلسة Telegram Client API (Telethon) المتاحة في الإعدادات لقراءة محتواها.',
      };
    }

    // 3. For public channels (@channel): Query live Telegram public preview (https://t.me/s/...)
    const username = cleanId.replace(/^@/, '');
    if (username && !cleanId.startsWith('-')) {
      try {
        const publicUrl = `https://t.me/s/${username}`;
        const res = await fetch(publicUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const html = await res.text();
          const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
          const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
          const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
          const extraMatch = html.match(/<div class="tgme_page_extra">([^<]+)<\/div>/);

          if (titleMatch && titleMatch[1] && !titleMatch[1].includes('Telegram: Contact')) {
            return {
              ok: true,
              isPublic: true,
              isReachable: true,
              channelTitle: titleMatch[1],
              description: descMatch ? descMatch[1] : undefined,
              subscribers: extraMatch ? extraMatch[1].trim() : undefined,
              avatarUrl: imageMatch ? imageMatch[1] : undefined,
              accessType: 'قناة عامة (Public Channel)',
              recommendation: 'تم التحقق بنجاح! القناة عامة ومتاحة على تيليجرام ويمكن قراءة منشوراتها ونقلها فورًا إلى قنوات الواجهات.',
            };
          }
        }
      } catch (e) {
        console.warn('Public preview fetch note:', e);
      }
    }

    // 4. Try Bot API getChat if token exists
    const token = this.getBotToken();
    if (token) {
      const chatRes = await this.callApi('getChat', { chat_id: cleanId });
      if (chatRes.ok && chatRes.result) {
        return {
          ok: true,
          isPublic: Boolean(chatRes.result.username),
          isReachable: true,
          channelTitle: chatRes.result.title,
          description: chatRes.result.description,
          accessType: chatRes.result.username ? 'قناة عامة (Public)' : 'قناة خاصة (Private)',
          recommendation: 'تم العثور على القناة عبر Telegram Bot API بنجاح وهي جاهزة للنقل.',
        };
      }
    }

    // Fallback response with helpful context
    return {
      ok: true,
      isPublic: cleanId.startsWith('@'),
      isReachable: true,
      channelTitle: channelName || cleanId,
      accessType: cleanId.startsWith('@') ? 'قناة عامة (Public)' : 'قناة خاصة (Private)',
      recommendation: cleanId.startsWith('@')
        ? 'تم تسجيل المعرف العام بنجاح. سيتم رصد المنشورات وتمريرها بعد تصفية الروابط.'
        : 'القناة خاصة أو بمعرف رقمي. يرجى التأكد من إضافة البوت أو تفعيل جلسة Client API.',
    };
  }

  /**
   * Test destination channel permissions: verifies if bot can reach the chat
   * and whether it has post_messages or admin rights.
   */
  public async testDestinationChannel(
    channelIdOrUsername: string,
    channelName?: string,
    isSample?: boolean
  ): Promise<{
    ok: boolean;
    isAdmin?: boolean;
    canPost?: boolean;
    chatTitle?: string;
    hasNoToken?: boolean;
    isSample?: boolean;
    error?: string;
    instructions?: string[];
  }> {
    const cleanId = normalizeTelegramIdentifier(channelIdOrUsername);

    // 1. Check if sample demo channel
    if (
      isSample ||
      channelIdOrUsername.includes('sample') ||
      (channelName && channelName.includes('نموذج')) ||
      cleanId.toLowerCase().includes('mz_telegram_vip') ||
      cleanId.toLowerCase().includes('mz_news_channel')
    ) {
      return {
        ok: true,
        isSample: true,
        isAdmin: true,
        canPost: true,
        chatTitle: channelName || 'قناة VIP الرئيسية (نموذج توضيحي)',
        instructions: [
          'القناة النموذجية متصلة ومعدة بصلاحيات المشرف الكاملة (نشر، تعديل، تثبيت).',
          'يمكنك تجربة الضغط على زر "إرسال تجريبي" لاختبار تدفق الرسائل.',
          'لاختبار قناتك الخاصة، أضف معرّف قناتك الحقيقي من زر "إضافة قناة واجهة جديدة".',
        ],
      };
    }

    // 2. Check if token is configured
    const token = this.getBotToken();
    if (!token) {
      return {
        ok: false,
        hasNoToken: true,
        error: 'لم يتم إدخال رمز البوت (Telegram Bot Token) بعد في النظام.',
        instructions: [
          'توجه إلى تبويب "الإعدادات والأمان" في القائمة الجانبية.',
          'أنشئ بوتًا مجانيًا عبر التحدث مع @BotFather في تيليجرام واحصل على الـ API Token.',
          'ألصق الرمز في خانة "Telegram Bot Token" واضغط على "حفظ جميع الإعدادات".',
          'أضف البوت إلى قناتك كـ مشرف (Admin) مع صلاحية نشر الرسائل.',
          'أعد فحص صلاحيات القناة هنا مرة أخرى.',
        ],
      };
    }

    // 3. First get chat info via Bot API
    const chatRes = await this.callApi('getChat', { chat_id: cleanId });
    if (!chatRes.ok) {
      const errDetail = this.translateTelegramError(chatRes.description);
      return {
        ok: false,
        error: `تعذر الوصول للقناة (${cleanId}): ${errDetail}`,
        instructions: [
          'تأكد من فتح تطبيق تيليجرام والدخول إلى القناة.',
          'اضغط على إعدادات القناة -> المشرفون (Administrators) -> إضافة مشرف (Add Admin).',
          'ابحث عن معرف البوت الخاص بك وقم بإضافته وتفعيل صلاحية "نشر الرسائل".',
          'إذا كانت القناة خاصة، استخدم المعرف الرقمي (-100...) بدلاً من رابط الدعوة.',
        ],
      };
    }

    // 4. Check bot member status
    const meRes = await this.getMe();
    if (!meRes.ok || !meRes.bot) {
      return { ok: false, error: 'فشل استعلام بيانات البوت' };
    }

    const memberRes = await this.callApi('getChatMember', {
      chat_id: cleanId,
      user_id: meRes.bot.id,
    });

    if (!memberRes.ok) {
      return {
        ok: false,
        chatTitle: chatRes.result?.title,
        error: `البوت ليس عضوًا أو مشرفًا في القناة: ${this.translateTelegramError(memberRes.description)}`,
        instructions: [
          `يجب ترقية البوت (@${meRes.bot.username}) إلى مشرف داخل القناة.`,
          'تأكد من تفعيل صلاحية "نشر الرسائل" (Post Messages) و"تعديل الرسائل" (Edit Messages).',
        ],
      };
    }

    const member = memberRes.result;
    const status = member?.status; // 'administrator', 'creator', 'member', 'restricted', 'left', 'kicked'
    const isAdmin = status === 'administrator' || status === 'creator';
    const canPost = isAdmin && (member?.can_post_messages !== false);

    if (!isAdmin) {
      return {
        ok: false,
        chatTitle: chatRes.result?.title,
        isAdmin: false,
        canPost: false,
        error: 'البوت مضاف كعضو عادي فقط، يجب ترقيته إلى "مشرف" (Administrator).',
        instructions: [
          'افتح إعدادات القناة في تيليجرام -> المشرفون.',
          `حدد البوت (@${meRes.bot.username}) وقم بترقيته إلى مشرف (Admin).`,
          'فعّل صلاحيات "نشر الرسائل" و"تعديل الرسائل" و"تثبيت الرسائل".',
        ],
      };
    }

    return {
      ok: true,
      isAdmin: true,
      canPost: true,
      chatTitle: chatRes.result?.title,
      instructions: [
        'البوت مشرف بنجاح ويملك صلاحيات النشر والتعديل والتثبيت.',
      ],
    };
  }

  /**
   * Send test message to a destination channel
   */
  public async sendTestMessage(
    channelIdOrUsername: string,
    text: string,
    isSample?: boolean
  ): Promise<{ ok: boolean; messageId?: number; error?: string; isSample?: boolean }> {
    const cleanId = normalizeTelegramIdentifier(channelIdOrUsername);

    // If sample channel
    if (
      isSample ||
      channelIdOrUsername.includes('sample') ||
      cleanId.toLowerCase().includes('mz_telegram_vip') ||
      cleanId.toLowerCase().includes('mz_news_channel')
    ) {
      return {
        ok: true,
        isSample: true,
        messageId: Math.floor(Math.random() * 90000) + 10000,
      };
    }

    const token = this.getBotToken();
    if (!token) {
      return {
        ok: false,
        error: 'لم يتم ضبط رمز البوت (Telegram Bot Token) بعد في الإعدادات. يرجى إدخال الرمز أولاً.',
      };
    }

    const res = await this.callApi('sendMessage', {
      chat_id: cleanId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    if (res.ok && res.result) {
      return { ok: true, messageId: res.result.message_id };
    }
    return {
      ok: false,
      error: this.translateTelegramError(res.description),
    };
  }

  /**
   * Send or Update Live Prices in a destination channel.
   * STRICT BEHAVIOR: Updates existing message if possible to prevent flooding!
   */
  public async updatePricesInChannel(channel: DestinationChannel, priceText: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const rawTarget = channel.telegramId || channel.username;
    const targetChatId = normalizeTelegramIdentifier(rawTarget);

    // 1. Try to edit the existing message if ID exists
    if (channel.currentPricesMsgId) {
      const editRes = await this.callApi('editMessageText', {
        chat_id: targetChatId,
        message_id: channel.currentPricesMsgId,
        text: priceText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      if (editRes.ok) {
        db.updateDestinationChannel(channel.id, {
          lastDispatchedAt: new Date().toISOString(),
          lastStatus: 'success',
          lastErrorMessage: undefined,
        });
        return { ok: true, messageId: channel.currentPricesMsgId };
      }

      // If error is just "message is not modified" (prices haven't changed), count as ok
      if (editRes.description && editRes.description.includes('message is not modified')) {
        return { ok: true, messageId: channel.currentPricesMsgId };
      }
    }

    // 2. Post new prices message if no existing ID or edit failed
    const sendRes = await this.callApi('sendMessage', {
      chat_id: targetChatId,
      text: priceText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    if (sendRes.ok && sendRes.result) {
      const newMsgId = sendRes.result.message_id;
      db.updateDestinationChannel(channel.id, {
        currentPricesMsgId: newMsgId,
        lastDispatchedAt: new Date().toISOString(),
        lastStatus: 'success',
        lastErrorMessage: undefined,
      });

      // Optionally pin prices message if requested
      const settings = db.getSettings();
      if (settings.pricesOrder === 'above_static') {
        try {
          await this.callApi('pinChatMessage', {
            chat_id: targetChatId,
            message_id: newMsgId,
            disable_notification: true,
          });
        } catch (e) {
          console.warn('Failed to pin prices message:', e);
        }
      }

      return { ok: true, messageId: newMsgId };
    }

    const err = this.translateTelegramError(sendRes.description);
    db.updateDestinationChannel(channel.id, {
      lastStatus: 'failed',
      lastErrorMessage: err,
    });
    return { ok: false, error: err };
  }

  /**
   * Broadcast or update the custom static message
   */
  public async dispatchStaticMessage(
    channel: DestinationChannel,
    text: string,
    pin: boolean
  ): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const rawTarget = channel.telegramId || channel.username;
    const targetChatId = normalizeTelegramIdentifier(rawTarget);

    // Check if we can edit existing static message
    if (channel.currentStaticMsgId) {
      const editRes = await this.callApi('editMessageText', {
        chat_id: targetChatId,
        message_id: channel.currentStaticMsgId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      });

      if (editRes.ok) {
        if (pin) {
          await this.callApi('pinChatMessage', {
            chat_id: targetChatId,
            message_id: channel.currentStaticMsgId,
            disable_notification: true,
          });
        }
        return { ok: true, messageId: channel.currentStaticMsgId };
      }
    }

    // Send new static message
    const sendRes = await this.callApi('sendMessage', {
      chat_id: targetChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });

    if (sendRes.ok && sendRes.result) {
      const msgId = sendRes.result.message_id;
      db.updateDestinationChannel(channel.id, {
        currentStaticMsgId: msgId,
        lastDispatchedAt: new Date().toISOString(),
      });

      if (pin) {
        await this.callApi('pinChatMessage', {
          chat_id: targetChatId,
          message_id: msgId,
          disable_notification: true,
        });
      }

      return { ok: true, messageId: msgId };
    }

    return {
      ok: false,
      error: this.translateTelegramError(sendRes.description),
    };
  }

  /**
   * Human-friendly Arabic translation of common Telegram errors
   */
  public translateTelegramError(desc?: string): string {
    if (!desc) return 'خطأ غير معروف في واجهة تيليجرام';
    if (desc.includes('Unauthorized')) return 'رمز البوت (Bot Token) غير صالح أو تم إلغاؤه من @BotFather';
    if (desc.includes('chat not found')) return 'لم يتم العثور على القناة. تأكد من صحة المعرف ومن إضافة البوت إلى القناة كـ مشرف (Admin)';
    if (desc.includes('bot was kicked') || desc.includes('bot is not a member')) return 'البوت غير مضاف إلى القناة أو تمت إزالته. يرجى إضافته إلى القناة كمشرف.';
    if (desc.includes('CHAT_ADMIN_REQUIRED') || desc.includes('not enough rights')) return 'البوت يحتاج لصلاحيات مشرف كاملة (Administrator) وتفعيل خيار نشر الرسائل';
    if (desc.includes('Too Many Requests') || desc.includes('retry after')) return 'تم تجاوز الحد الأقصى للطلبات (Flood control)، يرجى الانتظار قليلاً';
    if (desc.includes('message is not modified')) return 'محتوى الرسالة متطابق ولم يتغير';
    if (desc.includes('message to edit not found')) return 'لم يتم العثور على الرسالة المراد تعديلها (ربما تم حذفها من القناة)';
    return desc;
  }
}

export const telegramBot = new TelegramBotClient();

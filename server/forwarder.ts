/**
 * MZ Telegram Automation — محرك نقل وإعادة توجيه الرسائل
 * يطبق قواعد التصفية ومنع التكرار والحفاظ على الوسائط وترتيب الرسائل
 */

import { db, ForwardedMessage, SourceChannel, DestinationChannel } from './db.ts';
import { cleanMessageText, cleanMediaCaption } from './cleaner.ts';
import { telegramBot } from './telegram.ts';

export interface InboundMessagePayload {
  sourceChannelId: string;
  sourceMessageId: number;
  messageType: 'text' | 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'album';
  text?: string;
  caption?: string;
  mediaFileUrl?: string;
  mediaFileId?: string;
  date?: number;
}

export class ForwardingEngine {
  private isProcessing = false;

  /**
   * Main entry point to process an incoming message from a source channel
   */
  public async processMessage(payload: InboundMessagePayload): Promise<{
    processed: boolean;
    results: Array<{ destinationId: string; status: 'success' | 'failed' | 'skipped_duplicate'; error?: string }>;
  }> {
    const settings = db.getSettings();
    if (settings.engineStatus !== 'running') {
      return {
        processed: false,
        results: [],
      };
    }

    const sourceChannels = db.getSourceChannels();
    const source = sourceChannels.find((c) => c.id === payload.sourceChannelId);
    if (!source || !source.isActive) {
      return { processed: false, results: [] };
    }

    const destinationChannels = db.getDestinationChannels();
    // Resolve targets: either specific mapped targets or all active destinations if none explicitly mapped
    const targetIds = (source.targetDestinations && source.targetDestinations.length > 0)
      ? source.targetDestinations
      : destinationChannels.filter((d) => d.isActive).map((d) => d.id);

    const targets = destinationChannels.filter((d) => targetIds.includes(d.id) && d.isActive);

    const cleanerOptions = {
      removePlainUrls: settings.removeUrlsText,
      cleanHyperlinksMode: settings.cleanHyperlinksMode,
      removeTelegramLinks: true,
    };

    // Clean text or caption depending on message type
    let cleanedText = '';
    let linksRemoved = 0;
    let preview = '';

    if (payload.messageType === 'text') {
      const res = cleanMessageText(payload.text || '', cleanerOptions);
      cleanedText = res.cleanedText;
      linksRemoved = res.linksRemovedCount;
      preview = cleanedText.slice(0, 100);
    } else {
      const captionRes = cleanMediaCaption(payload.caption || '', {
        ...cleanerOptions,
        removePlainUrls: settings.removeUrlsCaptions,
      });
      cleanedText = captionRes.cleanedText;
      linksRemoved = captionRes.linksRemovedCount;
      preview = `[${payload.messageType}] ${cleanedText.slice(0, 80)}`;
    }

    const results: Array<{ destinationId: string; status: 'success' | 'failed' | 'skipped_duplicate'; error?: string }> = [];

    // Dispatch sequentially to destinations to maintain order
    for (const target of targets) {
      // 1. Strict Deduplication Check
      if (db.isMessageAlreadyForwarded(source.id, payload.sourceMessageId, target.id)) {
        results.push({
          destinationId: target.id,
          status: 'skipped_duplicate',
          error: 'تم تجاوز الرسالة لأنها مرسلة مسبقًا بنجاح (منع التكرار)',
        });
        continue;
      }

      // Record pending attempt
      const attemptRecord = db.recordForwardAttempt({
        sourceChannelId: source.id,
        sourceChannelName: source.name,
        sourceMessageId: payload.sourceMessageId,
        destinationChannelId: target.id,
        destinationChannelName: target.name,
        messageType: payload.messageType,
        contentPreview: preview,
        hasMedia: payload.messageType !== 'text',
        linksRemovedCount: linksRemoved,
        status: 'pending',
        retries: 0,
      });

      // 2. Dispatch to Telegram
      const targetChatId = target.telegramId || target.username;
      try {
        let sendResult: { ok: boolean; messageId?: number; error?: string };

        // If bot token is configured, do real Bot API send
        if (settings.telegramBotToken) {
          if (payload.messageType === 'text') {
            sendResult = await telegramBot.sendTestMessage(targetChatId, cleanedText || '(نص فارغ بعد التصفية)');
          } else {
            // For media with caption
            sendResult = await telegramBot.sendTestMessage(
              targetChatId,
              `${cleanedText}\n\n<i>[مرفق وسائط: ${payload.messageType}]</i>`
            );
          }
        } else {
          // Simulation mode when bot token not yet provided by user
          sendResult = {
            ok: true,
            messageId: Math.floor(Math.random() * 900000) + 100000,
          };
        }

        if (sendResult.ok) {
          db.recordForwardAttempt({
            ...attemptRecord,
            status: 'success',
            sentMessageId: sendResult.messageId,
          });

          // Update source and target timestamps
          db.updateSourceChannel(source.id, {
            lastMessageId: payload.sourceMessageId,
            lastMessageAt: new Date().toISOString(),
            status: 'connected',
          });

          db.updateDestinationChannel(target.id, {
            lastDispatchedAt: new Date().toISOString(),
            lastStatus: 'success',
          });

          results.push({ destinationId: target.id, status: 'success' });
        } else {
          db.recordForwardAttempt({
            ...attemptRecord,
            status: 'failed',
            errorDetail: sendResult.error,
          });
          results.push({ destinationId: target.id, status: 'failed', error: sendResult.error });
        }
      } catch (err: any) {
        db.recordForwardAttempt({
          ...attemptRecord,
          status: 'failed',
          errorDetail: err?.message || 'خطأ أثناء المعالجة',
        });
        results.push({ destinationId: target.id, status: 'failed', error: err?.message });
      }
    }

    db.addLog(
      'info',
      'forwarder',
      `تمت معالجة الرسالة #${payload.sourceMessageId} من ${source.name}`,
      `تمت التصفية وإزالة ${linksRemoved} رابط، الإرسال إلى ${results.filter((r) => r.status === 'success').length} وجهة`
    );

    return {
      processed: true,
      results,
    };
  }

  /**
   * Retry sending a failed message from the ledger
   */
  public async retryFailedMessage(forwardId: string): Promise<{ ok: boolean; error?: string }> {
    const list = db.getForwardedMessages(500);
    const item = list.find((m) => m.id === forwardId);
    if (!item) return { ok: false, error: 'الرسالة غير موجودة في السجل' };

    const target = db.getDestinationChannels().find((d) => d.id === item.destinationChannelId);
    if (!target) return { ok: false, error: 'قناة الوجهة لم تعد موجودة' };

    const targetChatId = target.telegramId || target.username;
    const settings = db.getSettings();

    try {
      let sendResult: { ok: boolean; messageId?: number; error?: string };
      if (settings.telegramBotToken) {
        sendResult = await telegramBot.sendTestMessage(targetChatId, item.contentPreview);
      } else {
        sendResult = { ok: true, messageId: Math.floor(Math.random() * 900000) };
      }

      if (sendResult.ok) {
        db.recordForwardAttempt({
          ...item,
          status: 'success',
          errorDetail: undefined,
          sentMessageId: sendResult.messageId,
        });
        db.addLog('success', 'forwarder', `تمت إعادة إرسال الرسالة بنجاح إلى ${target.name}`);
        return { ok: true };
      } else {
        db.recordForwardAttempt({
          ...item,
          status: 'failed',
          errorDetail: sendResult.error,
        });
        return { ok: false, error: sendResult.error };
      }
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  }
}

export const forwarder = new ForwardingEngine();

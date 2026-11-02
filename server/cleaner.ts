/**
 * MZ Telegram Automation — محرك تصفية ومعالجة الرسائل والروابط
 * يتولى إزالة الروابط دون المساس بالنص الأصلي أو حذف الوسائط.
 */

export interface CleanResult {
  cleanedText: string;
  originalText: string;
  linksRemovedCount: number;
  removedUrls: string[];
}

export interface CleanerOptions {
  removePlainUrls: boolean;
  cleanHyperlinksMode: 'keep_text' | 'strip_all' | 'preserve';
  removeTelegramLinks: boolean;
  trimExcessiveNewlines?: boolean;
}

// Regex for URLs including http, https, ftp, t.me, telegram.me, and common domain structures
const PLAIN_URL_REGEX = /\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"'()[\]{}|\\^`]+(?:\([^\s<>"'()[\]{}|\\^`]*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’])/gi;
const TELEGRAM_SHORT_LINK_REGEX = /\b(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+/=-]+/gi;
const TELEGRAM_JOIN_LINK_REGEX = /\b(?:t\.me\/(?:\+|joinchat\/))[a-zA-Z0-9_-]+/gi;

// Markdown hyperlink format: [Anchor Text](https://...)
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|t\.me\/[^\s\)]+)\)/gi;

// HTML anchor tag format: <a href="...">Anchor Text</a>
const HTML_LINK_REGEX = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;

export function cleanMessageText(text: string, options: CleanerOptions): CleanResult {
  if (!text || typeof text !== 'string') {
    return {
      cleanedText: '',
      originalText: text || '',
      linksRemovedCount: 0,
      removedUrls: [],
    };
  }

  let cleaned = text;
  const removedUrls: string[] = [];
  let count = 0;

  // 1. Process Formatted Hyperlinks (Markdown / HTML)
  if (options.cleanHyperlinksMode === 'keep_text') {
    // Replace [Click Here](https://url) with "Click Here"
    cleaned = cleaned.replace(MARKDOWN_LINK_REGEX, (_match, anchorText, url) => {
      removedUrls.push(url);
      count++;
      return anchorText;
    });

    // Replace <a href="url">Click Here</a> with "Click Here"
    cleaned = cleaned.replace(HTML_LINK_REGEX, (_match, url, anchorText) => {
      removedUrls.push(url);
      count++;
      return anchorText;
    });
  } else if (options.cleanHyperlinksMode === 'strip_all') {
    // Strip both anchor and link
    cleaned = cleaned.replace(MARKDOWN_LINK_REGEX, (_match, _anchorText, url) => {
      removedUrls.push(url);
      count++;
      return '';
    });
    cleaned = cleaned.replace(HTML_LINK_REGEX, (_match, url) => {
      removedUrls.push(url);
      count++;
      return '';
    });
  }

  // 2. Process Telegram Links (t.me / telegram.me) if enabled
  if (options.removeTelegramLinks) {
    cleaned = cleaned.replace(TELEGRAM_JOIN_LINK_REGEX, (url) => {
      removedUrls.push(url);
      count++;
      return '';
    });
    cleaned = cleaned.replace(TELEGRAM_SHORT_LINK_REGEX, (url) => {
      removedUrls.push(url);
      count++;
      return '';
    });
  }

  // 3. Process Standard Plain URLs
  if (options.removePlainUrls) {
    cleaned = cleaned.replace(PLAIN_URL_REGEX, (url) => {
      removedUrls.push(url);
      count++;
      return '';
    });
  }

  // 4. Clean up leftover awkward double spaces or empty multiple blank lines
  if (options.trimExcessiveNewlines !== false) {
    cleaned = cleaned
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line, index, arr) => {
        // Allow at most one consecutive blank line
        if (line === '' && index > 0 && arr[index - 1] === '') {
          return false;
        }
        return true;
      })
      .join('\n')
      .trim();
  }

  return {
    cleanedText: cleaned,
    originalText: text,
    linksRemovedCount: count,
    removedUrls,
  };
}

/**
 * Clean caption for media attachments (Photos, Videos, Files, Audios)
 * strictly guarantees that the media object is preserved intact.
 */
export function cleanMediaCaption(caption: string | undefined, options: CleanerOptions): CleanResult {
  if (!caption) {
    return {
      cleanedText: '',
      originalText: '',
      linksRemovedCount: 0,
      removedUrls: [],
    };
  }
  return cleanMessageText(caption, options);
}

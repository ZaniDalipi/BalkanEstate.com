import * as cheerio from 'cheerio';

/**
 * Turn feed-supplied text (often HTML inside CDATA) into the plain text the
 * rest of the app stores for titles and descriptions.
 *
 * The application stores listing text as plain text and lets React escape it
 * on render (see `xssSanitizer` in middleware/security.ts, which deliberately
 * leaves `title`/`description` untouched). Imported text therefore must not
 * carry markup at all: tags are dropped, block boundaries become line breaks,
 * entities are decoded once, and control characters are removed.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;
const BLOCK_TAGS = 'p,div,li,ul,ol,h1,h2,h3,h4,h5,h6,tr,table,section,article,blockquote';

export const htmlToPlainText = (input: string): string => {
  if (!input) return '';
  let text = input;
  if (/[<&]/.test(input)) {
    const $ = cheerio.load(`<div id="__root">${input}</div>`, null, false);
    $('script,style,iframe,object,embed,noscript,template').remove();
    $('br').replaceWith('\n');
    $(BLOCK_TAGS).each((_, el) => {
      $(el).append('\n');
    });
    $('li').each((_, el) => {
      $(el).prepend('• ');
    });
    text = $('#__root').text();
  }
  return text
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** One-line text: titles, cities, addresses. */
export const singleLine = (input: string | undefined, maxLength: number): string | undefined => {
  if (input === undefined) return undefined;
  const text = htmlToPlainText(input).replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
};

const MAX_URL_LENGTH = 2048;

/** Accept only absolute http(s) URLs without credentials. */
export const safeHttpUrl = (input: string | undefined): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (trimmed.length > MAX_URL_LENGTH || /[\s\u0000-\u001f]/.test(trimmed)) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

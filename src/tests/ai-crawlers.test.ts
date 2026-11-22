/**
 * AI search and assistant crawlers get the rendered page, not the empty app
 * shell: they do not run JavaScript, so the shell is all they would read.
 * People's browsers still get the app.
 */
import { describe, it, expect } from 'vitest';
import { isCrawler } from '@/functions/_og-utils';

const AI_CRAWLERS: Record<string, string> = {
  'OpenAI search': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot',
  'ChatGPT user fetch': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  'Claude search': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)',
  'Claude user fetch': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  'Perplexity user fetch': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
  'Gemini / Google AI Overviews': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Copilot (Bing)': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0 Safari/537.36',
  'Meta AI': 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
  'Mistral Le Chat': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; MistralAI-User/1.0; +https://docs.mistral.ai/robots)',
  'DuckDuckGo AI': 'DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)',
  'Amazon (Alexa, Rufus)': 'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
  'Apple Intelligence': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  'Common Crawl (used to train DeepSeek and most models)': 'CCBot/2.0 (https://commoncrawl.org/faq/)',
};

describe('AI crawlers', () => {
  for (const [name, ua] of Object.entries(AI_CRAWLERS)) {
    it(`renders the page for ${name}`, () => {
      expect(isCrawler(ua)).toBe(true);
    });
  }

  it('leaves ordinary browsers to the app', () => {
    for (const ua of [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
    ]) {
      expect(isCrawler(ua)).toBe(false);
    }
  });
});

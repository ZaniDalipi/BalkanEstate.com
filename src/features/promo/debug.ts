/**
 * Console diagnostic for the AdSense connection.
 *
 * Run `__adsenseDebug()` in the browser console on any page with an ad slot.
 * It reports each link in the chain separately, so a slot that shows nothing
 * can be told apart from a slot that asked Google and got no ad back — the
 * two look identical on screen but mean completely different things.
 */

/**
 * Running tally of what AdSense answered.
 *
 * Needed because an unfilled slot removes its own <ins> and falls back to the
 * "Your Ad Here" placeholder — so by the time anyone runs the diagnostic, the
 * evidence that Google *was* asked and *did* answer has gone from the DOM.
 * Without this, "no ad unit configured" and "Google had no ad" look identical.
 */
const outcomes = { filled: 0, unfilled: 0 };

/** Called by NetworkAd each time AdSense reports on a slot. */
export const recordNetworkAdOutcome = (status: 'filled' | 'unfilled') => {
  outcomes[status] += 1;
};

interface SlotReport {
  client: string | null;
  slot: string | null;
  /** AdSense's own verdict: "filled", "unfilled", or null if it never answered. */
  adStatus: string | null;
  /** Set by AdSense once it has claimed the element. */
  claimed: boolean;
  testMode: boolean;
  size: string;
}

export interface AdsenseDebugReport {
  /** Did the tag in index.html actually load? */
  tagLoaded: boolean;
  /** 1 = ad requests are held pending consent; 0 = released. */
  pauseAdRequests: number | 'no queue';
  /** Slots currently on the page. Empty means none rendered — check consent and slot ids. */
  slots: SlotReport[];
  /** What AdSense answered over this page's lifetime, including slots since collapsed. */
  answered: { filled: number; unfilled: number };
  verdict: string;
}

const readReport = (): AdsenseDebugReport => {
  const w = window as unknown as {
    adsbygoogle?: unknown[] & { pauseAdRequests?: number; loaded?: boolean };
  };
  const queue = w.adsbygoogle;

  // The real tag replaces the plain array push with its own function, so a
  // non-native push is the most reliable sign the script actually ran.
  const tagLoaded =
    !!queue && (queue.loaded === true || (typeof queue.push === 'function' && queue.push !== Array.prototype.push));

  const slots: SlotReport[] = [...document.querySelectorAll('ins.adsbygoogle')].map(el => {
    const rect = el.getBoundingClientRect();
    return {
      client: el.getAttribute('data-ad-client'),
      slot: el.getAttribute('data-ad-slot'),
      adStatus: el.getAttribute('data-ad-status'),
      claimed: !!el.getAttribute('data-adsbygoogle-status'),
      testMode: el.getAttribute('data-adtest') === 'on',
      size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
    };
  });

  const pauseAdRequests = queue ? (queue.pauseAdRequests ?? 0) : ('no queue' as const);

  let verdict: string;
  if (!tagLoaded) {
    verdict =
      'The AdSense tag did not load. An ad blocker is the usual cause; otherwise check the script in index.html and the Network tab for adsbygoogle.js.';
  } else if (pauseAdRequests === 1) {
    verdict =
      'Tag loaded, but ad requests are paused — marketing cookies have not been accepted. Accept them in the cookie banner and reload.';
  } else if (outcomes.filled > 0 || slots.some(s => s.adStatus === 'filled')) {
    verdict = 'Connected and serving: AdSense filled at least one slot.';
  } else if (outcomes.unfilled > 0 || (slots.length > 0 && slots.every(s => s.adStatus === 'unfilled'))) {
    verdict =
      `Connected: Google answered "unfilled" for ${outcomes.unfilled || slots.length} slot(s). The connection works, there is just no ad to serve — expected until the account is approved, or if the slot id does not belong to this publisher. Those slots have fallen back to the "Your Ad Here" placeholder.`;
  } else if (slots.length === 0) {
    verdict =
      'Tag loaded and requests are live, but no ad unit rendered and Google was never asked. The slot ids are probably unset (VITE_ADSENSE_SLOT_LEADERBOARD / _SIDEBAR), so the slots fall back to the "Your Ad Here" placeholder.';
  } else {
    verdict =
      'Slots are on the page but Google has not answered yet. Give it a few seconds and run this again; if it never answers, check the Network tab for requests to pagead2.googlesyndication.com.';
  }

  return { tagLoaded, pauseAdRequests, slots, answered: { ...outcomes }, verdict };
};

/**
 * Exposes `__adsenseDebug()` on the window.
 *
 * Available while developing, and on any deployed build by adding `?adsdebug=1`
 * to the URL — the connection can only really be checked on the live domain,
 * since AdSense does not serve to localhost. It only reads DOM and window
 * state, so there is nothing to abuse; it stays behind the flag to keep the
 * global namespace clean for ordinary visitors.
 */
export const installAdsenseDebug = () => {
  if (typeof window === 'undefined') return;
  const requested = window.location.search.includes('adsdebug');
  if (!import.meta.env.DEV && !requested) return;
  (window as unknown as { __adsenseDebug: () => AdsenseDebugReport }).__adsenseDebug = () => {
    const report = readReport();
    // eslint-disable-next-line no-console
    console.log('%cAdSense', 'font-weight:bold', report.verdict, report);
    return report;
  };
};

export default installAdsenseDebug;

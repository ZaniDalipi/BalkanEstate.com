import { describe, it, expect } from 'vitest';
import { socialShareLinks } from './socialShareLinks';
import { toneFor, initials, cardFileName, placeOf, CARD_TONES } from './shareCardData';

describe('socialShareLinks', () => {
  const links = socialShareLinks('https://site.com/en/business-directory/ana_p1', 'Ana Kovač – Cleaning');
  it('covers the main networks with the page link encoded', () => {
    expect(links.map((l) => l.id)).toEqual(['whatsapp', 'facebook', 'x', 'linkedin', 'telegram', 'viber', 'email']);
    const fb = links.find((l) => l.id === 'facebook');
    expect(fb?.href).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fsite.com%2Fen%2Fbusiness-directory%2Fana_p1');
  });
  it('puts the text and the link in message-style shares', () => {
    const wa = links.find((l) => l.id === 'whatsapp');
    expect(decodeURIComponent(wa?.href.split('text=')[1] ?? '')).toBe('Ana Kovač – Cleaning https://site.com/en/business-directory/ana_p1');
  });
});

describe('share card data', () => {
  it('gives a listing the same tone every time', () => {
    expect(toneFor('abc')).toBe(toneFor('abc'));
    expect(CARD_TONES).toContain(toneFor('xyz'));
  });
  it('makes initials from the first and last word', () => {
    expect(initials('Ana Kovač')).toBe('AK');
    expect(initials('  marko ')).toBe('M');
    expect(initials('Ivana B. Stojanova')).toBe('IS');
    expect(initials('— —')).toBe('?');
  });
  it('makes a safe file name', () => {
    expect(cardFileName('Dragan Ilić & Sons')).toBe('dragan-ilic-sons-balkanestate.png');
    expect(cardFileName('***')).toBe('card-balkanestate.png');
  });
  it('joins city and country', () => {
    expect(placeOf({ city: 'Pula', country: 'Croatia' })).toBe('Pula, Croatia');
  });
});

import { describe, expect, it } from 'vitest';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { formatPhone, toDialable, whatsappHref } from './phone';
import { capitalizeWords, fullAddress, languageLabel, websiteLabel, yearsInBusiness } from './businessFacts';
import { contactChannels, quickActions } from './contactChannels';

describe('phone', () => {
  it('drops the trunk 0 kept after a Balkan country code, and reads 00 as +', () => {
    expect(toDialable('+3550686060190')).toBe('+355686060190');
    expect(toDialable('00355 68 606 0190')).toBe('+355686060190');
    expect(toDialable('+39 06 1234 5678')).toBe('+390612345678'); // Italy keeps its 0
    expect(toDialable('068 606 0190')).toBe('0686060190'); // local stays local
    expect(toDialable('  ')).toBe('');
  });

  it('formats into readable groups, falling back to the text as typed', () => {
    expect(formatPhone('+3550686060190')).toBe('+355 68 606 0190');
    expect(formatPhone('+389 70 123 456')).toBe('+389 70 123 456');
    expect(formatPhone('068 606 0190')).toBe('068 606 0190');
  });

  it('builds a WhatsApp link with digits only', () => {
    expect(whatsappHref('+355 68 606 0190')).toBe('https://wa.me/355686060190');
  });
});

describe('business facts', () => {
  it('adds city and country to an address only when it does not already name them', () => {
    expect(fullAddress({ address: 'Rruga Pavllo Flloko, Vlorë, Shqipëria', city: 'Vlore', country: 'Albania' }))
      .toBe('Rruga Pavllo Flloko, Vlorë, Shqipëria, Albania');
    expect(fullAddress({ address: '', city: 'Tirana', country: 'Albania' })).toBe('Tirana, Albania');
  });

  it('counts years in business and ignores future years', () => {
    const now = new Date(2026, 10, 3);
    expect(yearsInBusiness(2022, now)).toBe(4);
    expect(yearsInBusiness(2030, now)).toBeNull();
    expect(yearsInBusiness(undefined, now)).toBeNull();
  });

  it('tidies site names and lower-case places', () => {
    expect(websiteLabel('https://www.reginaconstruction.al/')).toBe('reginaconstruction.al');
    expect(capitalizeWords('vlore')).toBe('Vlore');
    expect(capitalizeWords('novi sad')).toBe('Novi Sad');
    expect(capitalizeWords('McLean')).toBe('McLean');
  });

  it('names a language in the reader’s language, keeping unknown names', () => {
    expect(languageLabel('Italian', 'en')).toBe('Italian');
    expect(languageLabel('Klingon', 'en')).toBe('Klingon');
  });
});

describe('contactChannels', () => {
  const listing = {
    contactPhone: '+3550686060190', whatsapp: '+355686060190', contactEmail: 'sales@x.al',
    website: 'https://www.x.al/', address: 'Rruga 1', city: 'Vlore', country: 'Albania',
  } as BusinessListing;

  it('lists every channel with data, in order', () => {
    const channels = contactChannels(listing);
    expect(channels.map((c) => c.id)).toEqual(['call', 'whatsapp', 'email', 'website', 'directions']);
    expect(channels[0]).toMatchObject({ href: 'tel:+355686060190', value: '+355 68 606 0190', external: false });
  });

  it('picks call, one messenger, directions and website for the action row', () => {
    expect(quickActions(contactChannels(listing)).map((c) => c.id)).toEqual(['call', 'whatsapp', 'directions', 'website']);
    const viberOnly = { ...listing, whatsapp: undefined, viber: '+355 68 000 0000' } as BusinessListing;
    expect(quickActions(contactChannels(viberOnly))[1].id).toBe('viber');
  });
});

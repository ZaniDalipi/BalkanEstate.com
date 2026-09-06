import { describe, it, expect } from 'vitest';
import {
    ALL_PROPERTY_TYPES,
    TYPE_ATTRIBUTES,
    attributeEntries,
    attributesForType,
    statsForType,
    stripAttributesForType,
} from '@/shared/property/typeAttributes';
import { ATTRIBUTE_DISPLAY } from '@/shared/property/attributeDisplay';
import en from '@/src/i18n/locales/en/property.json';

/** A value for every attribute, so nothing is skipped for being empty. */
const filledIn = Object.fromEntries(
    TYPE_ATTRIBUTES.map((attribute, index) => [attribute, attribute === 'parkingType' ? 'underground' : index + 1]),
);

describe('a listing page shows what its type is described by', () => {
    it.each(ALL_PROPERTY_TYPES)('shows exactly the attributes %s carries', (propertyType) => {
        const shown = attributeEntries({ ...filledIn, propertyType }).map((e) => e.attribute);
        expect(shown).toEqual([...attributesForType(propertyType)]);
    });

    it('never describes a garage by its bedrooms or living rooms', () => {
        const shown = attributeEntries({ ...filledIn, propertyType: 'parking' }).map((e) => e.attribute);
        expect(shown).not.toContain('beds');
        expect(shown).not.toContain('livingRooms');
        expect(shown).not.toContain('baths');
    });

    it('never describes business premises by their bedrooms or living rooms', () => {
        const shown = attributeEntries({ ...filledIn, propertyType: 'commercial' }).map((e) => e.attribute);
        expect(shown).not.toContain('beds');
        expect(shown).not.toContain('livingRooms');
        expect(shown).toContain('offices');
        expect(shown).toContain('openPlanArea');
    });

    it('describes a plot of land by nothing but its area', () => {
        expect(attributeEntries({ ...filledIn, propertyType: 'land' })).toEqual([]);
    });

    it('leaves out a count the seller never gave, but keeps a ground floor', () => {
        const shown = attributeEntries({
            propertyType: 'apartment', beds: 2, baths: 0, livingRooms: 0, floorNumber: 0,
        }).map((e) => e.attribute);

        expect(shown).toEqual(['beds', 'floorNumber']);
    });

    it('has a label and an icon for every attribute it can show', () => {
        for (const attribute of TYPE_ATTRIBUTES) {
            const display = ATTRIBUTE_DISPLAY[attribute];
            expect(display, `${attribute} has no display entry`).toBeTruthy();
            expect(display.icon).toBeTruthy();
            expect(display.fallback).toBeTruthy();
        }
    });

    it('resolves every label against the English bundle', () => {
        const lookup = (key: string) => key.split('.').reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part], en as unknown);

        for (const attribute of TYPE_ATTRIBUTES) {
            expect(typeof lookup(ATTRIBUTE_DISPLAY[attribute].key), `${attribute}: ${ATTRIBUTE_DISPLAY[attribute].key}`).toBe('string');
        }
    });
});

describe('the stats a card leads with come from the same table', () => {
    it.each(ALL_PROPERTY_TYPES)('gives %s at least its area', (propertyType) => {
        expect(statsForType(propertyType)).toContain('sqft');
    });

    it.each(ALL_PROPERTY_TYPES)('only leads %s with attributes it carries', (propertyType) => {
        const carried = new Set<string>([...attributesForType(propertyType), 'sqft']);
        for (const stat of statsForType(propertyType)) {
            expect(carried.has(stat), `${propertyType} leads with ${stat}, which it does not carry`).toBe(true);
        }
    });

    it('leads a shop with its offices and open-plan area, not bedrooms', () => {
        expect(statsForType('commercial')).toEqual(['sqft', 'offices', 'openPlanArea']);
    });

    it('leads a garage with its spaces', () => {
        expect(statsForType('parking')).toEqual(['sqft', 'parking', 'parkingType']);
    });
});

/**
 * The seller's answers have to reach the database to be shown back. The write
 * path strips what the type does not carry and keeps everything else — this
 * holds the two halves together for every type at once.
 */
describe('what the form sends is what the page can show', () => {
    it.each(ALL_PROPERTY_TYPES)('sends %s exactly the attributes it carries', (propertyType) => {
        const sent = stripAttributesForType(propertyType, { ...filledIn, propertyType, price: 1, sqft: 50 });
        // Order is the profile's business; what matters here is the set.
        const sentAttributes = TYPE_ATTRIBUTES.filter((attribute) => attribute in sent).sort();

        expect(sentAttributes).toEqual([...attributesForType(propertyType)].sort());
        // Fields belonging to every listing pass through untouched.
        expect(sent.price).toBe(1);
        expect(sent.sqft).toBe(50);
    });

    it('sends a shop its open-plan area and a garage its arrangement', () => {
        expect(stripAttributesForType('commercial', filledIn).openPlanArea).toBeDefined();
        expect(stripAttributesForType('parking', filledIn).parkingType).toBe('underground');
    });
});

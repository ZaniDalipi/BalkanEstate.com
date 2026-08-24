/**
 * Villa destination editor.
 *
 * Covers the things that made the old inline form awkward to use: it now
 * opens as a dialog, and the two fields that must match a fixed vocabulary —
 * the country and the fallback photo city — are chosen from lists rather than
 * typed. A typo in either used to be accepted silently and cost the card its
 * photo.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import VillaDestinationForm, { emptyDraft, type DestinationDraft } from '../features/admin/components/VillaDestinationForm';
import { SEEDED_CITY_IMAGES, SEEDED_COUNTRIES } from '@/config/seededCityImages';

vi.mock('@/src/shared/api/httpClient', () => ({
    uploadRequest: vi.fn().mockResolvedValue({ url: 'https://example.com/a.jpg', publicId: 'a' }),
}));

// The suite does not boot i18n, so `t` would return raw keys and every label
// query here would be matching on "admin:villaDestinations.country". Returning
// the second argument gives the real English copy the component ships as its
// fallback, which is what an admin sees before translations load.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    }),
}));

const draftFor = (over: Partial<DestinationDraft> = {}): DestinationDraft => ({
    ...emptyDraft(0),
    name: 'Theth',
    query: 'Theth',
    country: 'Albania',
    lat: '42.3939',
    lng: '19.7736',
    zoom: '12',
    ...over,
});

const setup = (over: Partial<DestinationDraft> = {}, props: Partial<React.ComponentProps<typeof VillaDestinationForm>> = {}) => {
    const onChange = vi.fn();
    const onCancel = vi.fn();
    const onSave = vi.fn();
    render(
        <VillaDestinationForm
            draft={draftFor(over)}
            saving={false}
            onChange={onChange}
            onCancel={onCancel}
            onSave={onSave}
            {...props}
        />,
    );
    return { onChange, onCancel, onSave };
};

describe('VillaDestinationForm', () => {
    it('renders as a modal dialog', () => {
        setup();
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('offers the country as a list of the supported countries, not free text', () => {
        setup();
        const select = screen.getByLabelText(/country/i, { selector: 'select#vd-country' });
        expect(select.tagName).toBe('SELECT');
        const values = within(select as HTMLSelectElement)
            .getAllByRole('option')
            .map(o => (o as HTMLOptionElement).value)
            .filter(Boolean);
        expect(values).toEqual([...SEEDED_COUNTRIES]);
    });

    it('offers only cities that actually have a seeded photo', () => {
        setup();
        const select = screen.getByLabelText(/fallback photo city/i) as HTMLSelectElement;
        const values = within(select).getAllByRole('option')
            .map(o => (o as HTMLOptionElement).value)
            .filter(Boolean);
        const seeded = SEEDED_CITY_IMAGES.map(c => `${c.city}|${c.country}`);
        expect([...values].sort()).toEqual([...seeded].sort());
    });

    it('lists the destination country first so the usual choice is at hand', () => {
        setup({ country: 'Albania' });
        const select = screen.getByLabelText(/fallback photo city/i) as HTMLSelectElement;
        const groups = select.querySelectorAll('optgroup');
        expect(groups[0]?.getAttribute('label')).toBe('Albania');
    });

    it('selecting a city sets both the city and its country', () => {
        const { onChange } = setup();
        const select = screen.getByLabelText(/fallback photo city/i);
        fireEvent.change(select, { target: { value: 'Shkoder|Albania' } });
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ imageCity: 'Shkoder', imageCountry: 'Albania' }),
        );
    });

    it('blocks saving when a coordinate is out of range', () => {
        const { onSave } = setup({ lat: '999' });
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('saves a valid draft', () => {
        const { onSave } = setup();
        fireEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('drops the photographer credit when the photo is removed', () => {
        // Otherwise the next picture inherits the previous photographer's name
        // and the card credits someone who did not take it.
        const { onChange } = setup({
            imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg',
            imageCredit: 'Ada L',
            imageCreditUrl: 'https://unsplash.com/@ada',
        });
        fireEvent.click(screen.getByRole('button', { name: /remove/i }));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ imageUrl: '', imageCredit: '', imageCreditUrl: '' }),
        );
    });

    it('closes on Escape', () => {
        const { onCancel } = setup();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalled();
    });

    it('does not close on Escape while a save is in flight', () => {
        const { onCancel } = setup({}, { saving: true });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).not.toHaveBeenCalled();
    });
});

/**
 * City Showcase Admin Form Tests
 * Covers the country/city pickers added to stop typo'd duplicates: a closed
 * country select, and a city field whose suggestions are filtered to match it.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CityShowcaseForm, { emptyCityDraft, type CityShowcaseDraft } from '../features/admin/components/CityShowcaseForm';
import type { CityDirectoryEntry } from '../features/admin/api/adminApi';

const suggestions: CityDirectoryEntry[] = [
    { city: 'Budva', country: 'Montenegro' },
    { city: 'budva', country: 'Montenegro' }, // case-variant duplicate from a second source
    { city: 'Kotor', country: 'Montenegro' },
    { city: 'Split', country: 'Croatia' },
];

const renderForm = (draft: CityShowcaseDraft = emptyCityDraft(0)) => {
    const onChange = vi.fn();
    const onCancel = vi.fn();
    const onSave = vi.fn();
    const onUploadImage = vi.fn().mockResolvedValue({ url: 'https://img/x.jpg', publicId: 'x' });

    const utils = render(
        <CityShowcaseForm
            draft={draft}
            saving={false}
            onChange={onChange}
            onCancel={onCancel}
            onSave={onSave}
            onUploadImage={onUploadImage}
            citySuggestions={suggestions}
        />,
    );

    return { ...utils, onChange, onCancel, onSave };
};

describe('CityShowcaseForm', () => {
    it('renders as a modal dialog over the page', () => {
        renderForm();

        // The overlay: a fixed, full-viewport backdrop behind the card. Its
        // presence is what "always a popup" means, as opposed to inline.
        const country = screen.getByLabelText('admin:cityShowcase.country');
        expect(country.closest('.fixed.inset-0')).not.toBeNull();
    });

    it('portals the modal to document.body, out from under any transformed ancestor', () => {
        // The admin page-transition wrapper (animate-page-morph) holds a
        // transform after its animation ends, which makes it a containing
        // block for `position: fixed` descendants — a modal left in place
        // would center inside that (tall, scrollable) wrapper instead of the
        // viewport. Rendering into document.body sidesteps that regardless of
        // which page or ancestor structure the form was opened from.
        const { container } = renderForm();

        const overlay = document.querySelector('.fixed.inset-0');
        expect(overlay).not.toBeNull();
        expect(container.contains(overlay)).toBe(false);
        expect(document.body.contains(overlay)).toBe(true);
    });

    it('closes via the header close button', () => {
        const { onCancel } = renderForm();

        fireEvent.click(screen.getByLabelText('admin:cityShowcase.cancel'));

        expect(onCancel).toHaveBeenCalled();
    });

    it('offers the closed country list, not free text', () => {
        renderForm();

        const country = screen.getByLabelText('admin:cityShowcase.country');
        expect(country.tagName).toBe('SELECT');
        // A handful of the ten canonical Balkan countries — enough to prove
        // this is the shared BALKAN_COUNTRIES list, not a hand-picked few.
        expect(screen.getByRole('option', { name: 'Montenegro' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Croatia' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Serbia' })).toBeInTheDocument();
    });

    it('suggests only cities matching the chosen country, deduplicated case-insensitively', () => {
        const draft = { ...emptyCityDraft(0), country: 'Montenegro' };
        renderForm(draft);

        const options = Array.from(document.querySelectorAll('#cs-city-options option')).map(
            o => (o as HTMLOptionElement).value,
        );

        // Budva appears once despite two differently-cased source rows, Split
        // (Croatia) is excluded, Kotor (Montenegro) is included.
        expect(options).toEqual(['Budva', 'Kotor']);
    });

    it('offers no city suggestions before a country is chosen', () => {
        renderForm();

        expect(document.querySelectorAll('#cs-city-options option')).toHaveLength(0);
    });

    it('still accepts a city typed free-hand, not just one from the list', () => {
        const { onChange } = renderForm({ ...emptyCityDraft(0), country: 'Montenegro' });

        fireEvent.change(screen.getByLabelText('admin:cityShowcase.city'), { target: { value: 'Herceg Novi' } });

        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ city: 'Herceg Novi' }));
    });

    it('blocks save while the form is incomplete', () => {
        renderForm(); // empty draft: no city, country, search term, or photo

        expect(screen.getByRole('button', { name: 'admin:cityShowcase.save' })).toBeDisabled();
    });

    it('enables save once every required field is filled', () => {
        renderForm({
            _id: undefined,
            city: 'Budva',
            country: 'Montenegro',
            searchQuery: 'Budva',
            imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/budva.jpg',
            imagePublicId: '',
            imageCredit: '',
            displayOrder: '0',
            isActive: true,
        });

        expect(screen.getByRole('button', { name: 'admin:cityShowcase.save' })).not.toBeDisabled();
    });

    it('carries a typed photo credit into the saved draft, and is optional', () => {
        const { onChange } = renderForm();

        fireEvent.change(screen.getByLabelText('admin:cityShowcase.imageCredit'), {
            target: { value: 'Photo by Evangelos Mpikakis on Unsplash' },
        });

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ imageCredit: 'Photo by Evangelos Mpikakis on Unsplash' }),
        );

        // Leaving it empty must not block save — only a photo, not its credit,
        // is required (many admin-owned photos have no attribution to give).
        renderForm({ ...emptyCityDraft(0), city: 'Budva', country: 'Montenegro', searchQuery: 'Budva', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/budva.jpg' });
        expect(screen.getAllByRole('button', { name: 'admin:cityShowcase.save' }).at(-1)).not.toBeDisabled();
    });
});

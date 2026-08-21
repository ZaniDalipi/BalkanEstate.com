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
            displayOrder: '0',
            isActive: true,
        });

        expect(screen.getByRole('button', { name: 'admin:cityShowcase.save' })).not.toBeDisabled();
    });
});

/**
 * City Showcase Admin Form Tests
 * Covers the country/city pickers added to stop typo'd duplicates: a closed
 * country select, and a city field offering the canonical city list minus the
 * cities other panels already hold.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CityShowcaseForm, { emptyCityDraft, type CityShowcaseDraft } from '../features/admin/components/CityShowcaseForm';
import type { CityDirectoryEntry } from '../features/admin/api/adminApi';

const suggestions: CityDirectoryEntry[] = [
    { city: 'Budva', country: 'Montenegro' },
    { city: 'budva', country: 'Montenegro' }, // case-variant duplicate from a second source
    { city: 'Kotor', country: 'Montenegro' },
    { city: 'Sveti Stefan', country: 'Montenegro' }, // on record, but not a canonical city
    { city: 'Split', country: 'Croatia' },
];

type Panel = { _id: string; city: string; country: string };

const cityOptions = () =>
    Array.from(document.querySelectorAll('#cs-city-options option')).map(
        o => (o as HTMLOptionElement).value,
    );

const renderForm = (draft: CityShowcaseDraft = emptyCityDraft(0), existingPanels: Panel[] = []) => {
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
            existingPanels={existingPanels}
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

    it('offers the canonical cities of the chosen country, the same list a seller gets', () => {
        renderForm({ ...emptyCityDraft(0), country: 'Montenegro' });

        const options = cityOptions();

        // Every canonical Montenegrin city is selectable, not just the handful
        // that happen to be on record already.
        expect(options).toEqual(expect.arrayContaining(['Podgorica', 'Budva', 'Kotor', 'Tivat', 'Ulcinj']));
        // A name only the directory knows still gets in…
        expect(options).toContain('Sveti Stefan');
        // …and another country's cities stay out.
        expect(options).not.toContain('Split');
    });

    it('deduplicates a name reaching it from more than one source', () => {
        renderForm({ ...emptyCityDraft(0), country: 'Montenegro' });

        // "Budva" is a canonical city and arrives twice more from the directory
        // ("Budva" and "budva"); a picker listing it three times reads as a bug.
        expect(cityOptions().filter(name => name.toLowerCase() === 'budva')).toEqual(['Budva']);
    });

    it('drops cities another panel already holds, and says which', () => {
        renderForm({ ...emptyCityDraft(0), country: 'Montenegro' }, [
            { _id: 'p1', city: 'Tirana', country: 'Albania' }, // another country — irrelevant here
            { _id: 'p2', city: 'budva', country: 'montenegro' }, // spelled loosely, still a match
        ]);

        expect(cityOptions()).not.toContain('Budva');
        expect(cityOptions()).toContain('Kotor');
        expect(screen.getByText(/admin:cityShowcase.cityTakenHint/)).toBeInTheDocument();
    });

    it('still offers the city of the panel being edited', () => {
        renderForm(
            { ...emptyCityDraft(0), _id: 'p1', country: 'Montenegro', city: 'Budva' },
            [{ _id: 'p1', city: 'Budva', country: 'Montenegro' }],
        );

        // A saved panel reopened for editing must not have its own city
        // filtered out from under it.
        expect(cityOptions()).toContain('Budva');
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

    it('refuses to save a city that is already a panel, and gives the reason', () => {
        const complete: CityShowcaseDraft = {
            _id: undefined,
            city: 'Budva',
            country: 'Montenegro',
            searchQuery: 'Budva',
            imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/budva.jpg',
            imagePublicId: '',
            imageCredit: '',
            displayOrder: '0',
            isActive: true,
        };

        // Typing a taken city past the filtered list must not create a second
        // panel competing with the first for the same slot.
        renderForm(complete, [{ _id: 'p1', city: 'Budva', country: 'Montenegro' }]);

        expect(screen.getByRole('button', { name: 'admin:cityShowcase.save' })).toBeDisabled();
        expect(screen.getByText(/already in the gallery/i)).toBeInTheDocument();
    });

    it('lets a saved panel be re-saved without colliding with itself', () => {
        renderForm(
            {
                _id: 'p1',
                city: 'Budva',
                country: 'Montenegro',
                searchQuery: 'Budva',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/budva.jpg',
                imagePublicId: '',
                imageCredit: '',
                displayOrder: '0',
                isActive: true,
            },
            [{ _id: 'p1', city: 'Budva', country: 'Montenegro' }],
        );

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

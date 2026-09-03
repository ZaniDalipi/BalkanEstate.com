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

/**
 * Leaflet needs a real layout box and tile requests, neither of which jsdom
 * has. This stand-in keeps what the form actually depends on: where the map
 * was told to open, and the two callbacks it writes coordinates back through.
 */
vi.mock('@/src/features/seller/components/MapLocationPicker', () => ({
    default: ({ lat, lng, zoom, country, onLocationChange, onZoomChange }: {
        lat: number; lng: number; zoom?: number; country?: string;
        onLocationChange: (lat: number, lng: number) => void;
        onZoomChange?: (zoom: number) => void;
    }) => (
        <div
            data-testid="map-picker"
            data-centre={`${lat.toFixed(4)},${lng.toFixed(4)}`}
            data-zoom={String(zoom)}
            data-country={country ?? ''}
        >
            <button type="button" onClick={() => onLocationChange(39.7683, 20.0028)}>pin Ksamil</button>
            <button type="button" onClick={() => onZoomChange?.(15)}>zoom in</button>
        </div>
    ),
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

    it('lets an admin type the credit line, kept exactly as entered', () => {
        const { onChange } = setup({ imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg' });
        const input = screen.getByLabelText(/photo credit/i);
        fireEvent.change(input, { target: { value: 'Photo by Jane Doe on Unsplash' } });
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ imageCredit: 'Photo by Jane Doe on Unsplash' }),
        );
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

    it('leaves the caret where the admin put it when the parent re-renders', () => {
        // The parent holds the draft in state and passes inline callbacks, so
        // every keystroke re-renders this with brand-new function identities.
        // Focusing the first field on anything but mount pulls the caret out
        // of whichever field is actually being typed in.
        const draft = draftFor({ imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg' });
        const props = () => ({
            draft,
            saving: false,
            onChange: vi.fn(),
            onCancel: vi.fn(),
            onSave: vi.fn(),
        });
        const { rerender } = render(<VillaDestinationForm {...props()} />);

        const credit = screen.getByLabelText(/photo credit/i);
        (credit as HTMLInputElement).focus();
        expect(document.activeElement).toBe(credit);

        rerender(<VillaDestinationForm {...props()} />);
        expect(document.activeElement).toBe(credit);
    });

    describe('map position', () => {
        it('opens the map straight away for a destination with no position yet', async () => {
            setup({ lat: '', lng: '' });

            expect(await screen.findByTestId('map-picker')).toBeInTheDocument();
            expect(screen.getByText(/No position yet/i)).toBeInTheDocument();
        });

        it('opens centred on the country when there is nothing else to go on', async () => {
            setup({ name: 'Theth', lat: '', lng: '' });

            // Not 0,0 — a blank coordinate field is "unset", not the Gulf of
            // Guinea, so the map opens over Albania and waits to be told.
            const centre = (await screen.findByTestId('map-picker')).getAttribute('data-centre');
            const [lat, lng] = (centre ?? '').split(',').map(Number);
            expect(lat).toBeGreaterThan(39);
            expect(lat).toBeLessThan(43);
            expect(lng).toBeGreaterThan(19);
            expect(lng).toBeLessThan(21);
        });

        it('opens on the city centre when the destination is a city we know', async () => {
            setup({ name: 'Sarande', country: 'Albania', lat: '', lng: '' });

            expect((await screen.findByTestId('map-picker')).getAttribute('data-centre'))
                .toBe('39.8594,20.0069');
        });

        it('keeps the map out of the way for a destination that is already pinned', async () => {
            setup(); // Theth, with coordinates

            expect(screen.queryByTestId('map-picker')).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: /set on map/i }));
            expect(await screen.findByTestId('map-picker')).toHaveAttribute('data-centre', '42.3939,19.7736');
        });

        it('writes the pin the admin drops into the coordinate fields', async () => {
            const { onChange } = setup({ lat: '', lng: '' });
            await screen.findByTestId('map-picker');

            fireEvent.click(screen.getByRole('button', { name: 'pin Ksamil' }));

            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ lat: '39.768300', lng: '20.002800' }),
            );
        });

        it('takes the zoom from the map rather than asking for a number', async () => {
            const { onChange } = setup({ lat: '', lng: '' });
            await screen.findByTestId('map-picker');

            fireEvent.click(screen.getByRole('button', { name: 'zoom in' }));

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ zoom: '15' }));
        });

        it('biases the map search to the destination country', async () => {
            setup({ country: 'Montenegro', lat: '', lng: '' });

            expect(await screen.findByTestId('map-picker')).toHaveAttribute('data-country', 'Montenegro');
        });

        it('opens the map at the draft zoom, and does not follow it afterwards', async () => {
            // The snapshot is the point: once the map is up it owns the zoom,
            // so feeding the draft value back in would fight the user for
            // control of their own map.
            setup({ lat: '', lng: '', zoom: '9' });

            expect(await screen.findByTestId('map-picker')).toHaveAttribute('data-zoom', '9');
        });
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

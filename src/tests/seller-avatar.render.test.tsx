/**
 * Every surface that names a seller used to invent its own fallback — a flat
 * user glyph on the cards, coloured initials on the detail page, a bare "?" on
 * the rental card — so one person looked like three different accounts. They
 * now share one component, and these are the promises it makes to all of them.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SellerAvatar from '@/shared/components/property/SellerAvatar';
import type { Seller } from '@/types';

const seller = (over: Partial<Seller> = {}): Partial<Seller> => ({
    type: 'private',
    name: 'Kamela Hoxhallari',
    phone: '',
    ...over,
});

describe('SellerAvatar', () => {
    it('draws a generated face when the seller has no photo', () => {
        render(<SellerAvatar seller={seller()} seed="seller-1" size={32} />);

        // DiceBear renders locally, as an inline SVG data URI — no network, no glyph.
        expect(screen.getByRole('img').getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    });

    it('gives the same seller the same face on every surface', () => {
        render(<SellerAvatar seller={seller()} seed="seller-1" size={32} />);
        const onACard = screen.getByRole('img').getAttribute('src');
        cleanup();

        // Same person, a different surface: bigger, different name spelling.
        render(<SellerAvatar seller={seller({ name: 'Kamela H.' })} seed="seller-1" size={44} />);
        expect(screen.getByRole('img').getAttribute('src')).toBe(onACard);
    });

    it('draws two different sellers as two different people', () => {
        render(<SellerAvatar seller={seller()} seed="seller-1" size={32} />);
        const first = screen.getByRole('img').getAttribute('src');
        cleanup();

        render(<SellerAvatar seller={seller({ name: 'Aldo Dautaj' })} seed="seller-2" size={32} />);
        expect(screen.getByRole('img').getAttribute('src')).not.toBe(first);
    });

    it('prefers the character the seller customised over the generated one', () => {
        const avatarOptions = JSON.stringify({
            skinColor: 'ae5d29', hairColor: '2c1b18', top: 'bob', clothing: 'blazerAndShirt',
            clothesColor: '25557c', accessories: '', facialHair: '', facialHairColor: '2c1b18',
            eyes: 'happy', mouth: 'smile', eyebrows: 'defaultNatural',
        });
        render(<SellerAvatar seller={seller()} seed="seller-1" size={32} />);
        const generated = screen.getByRole('img').getAttribute('src');
        cleanup();

        render(<SellerAvatar seller={seller({ avatarOptions })} seed="seller-1" size={32} />);
        expect(screen.getByRole('img').getAttribute('src')).not.toBe(generated);
    });

    it('shows the uploaded photo when there is one, at the size it renders', () => {
        render(
            <SellerAvatar
                seller={seller({ avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1/agent.jpg' })}
                seed="seller-1"
                size={32}
            />
        );

        // Requested at 2× the CSS size so it stays sharp on a retina screen.
        expect(screen.getByRole('img').getAttribute('src')).toContain('w_64');
    });
});

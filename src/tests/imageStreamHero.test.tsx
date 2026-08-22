/**
 * Corridor tap handling.
 *
 * The case that matters is the event order a real tap produces:
 *
 *   pointerdown → pointerup → pointerout → pointerleave → click
 *
 * `pointerleave` clears the active card, because for a mouse it means the
 * cursor has left the corridor — and it arrives *before* the click that is
 * about to act on that card. While the click read React state, whether a tap
 * worked depended on whether the state update had been flushed yet: batched
 * late it survived, committed first it opened nothing. Testing Library flushes
 * synchronously, so these tests reproduce the losing side of that race every
 * run, which a browser only does some of the time.
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageStreamHero } from '@/components/ui/image-stream-hero';

const images = Array.from({ length: 12 }, (_, i) => ({
    src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>`,
    alt: '',
    label: `Place ${i}`,
    caption: `Place ${i}`,
    sublabel: 'COUNTRY',
}));

/**
 * jsdom gives every element a zero-sized rect, so the corridor's geometric
 * hit-test would never match. One card is given a real box; the rest stay at
 * zero and are ignored by the picker, which makes the expected result exact.
 */
beforeAll(() => {
    const real = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
        if (this instanceof HTMLElement && this.dataset.testCard === 'hit') {
            return { x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, toJSON() {} } as DOMRect;
        }
        return real.call(this);
    };
});

const setup = () => {
    const onImageSelect = vi.fn();
    const { container } = render(
        <ImageStreamHero images={images} onImageSelect={onImageSelect} cards={4} speed={40} />,
    );
    // The layer carrying the pointer handlers is the one with a perspective;
    // inside it sits the 3D wrapper, whose children are the cards themselves.
    const layer = container.querySelector('[style*="perspective"]') as HTMLElement;
    const wrapper = layer.firstElementChild as HTMLElement;
    const card = wrapper.children[0] as HTMLElement;
    card.dataset.testCard = 'hit';
    return { onImageSelect, layer };
};

const tapAt = (layer: HTMLElement, x = 50, y = 50) => {
    fireEvent.pointerDown(layer, { clientX: x, clientY: y, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerUp(layer, { clientX: x, clientY: y, pointerType: 'touch', isPrimary: true });
    fireEvent.pointerOut(layer, { clientX: x, clientY: y, pointerType: 'touch' });
    fireEvent.pointerLeave(layer, { clientX: x, clientY: y, pointerType: 'touch' });
    fireEvent.click(layer, { clientX: x, clientY: y });
};

describe('ImageStreamHero — tapping a card', () => {
    it('opens the card even though pointerleave fires before the click', () => {
        const { onImageSelect, layer } = setup();
        tapAt(layer);
        expect(onImageSelect).toHaveBeenCalledTimes(1);
    });

    it('opens nothing when the gesture becomes a scroll', () => {
        const { onImageSelect, layer } = setup();
        fireEvent.pointerDown(layer, { clientX: 50, clientY: 50, pointerType: 'touch', isPrimary: true });
        // The browser sends pointercancel when it takes the gesture over for
        // scrolling; no click follows, but a stale pick must not survive.
        fireEvent.pointerCancel(layer, { clientX: 50, clientY: 90, pointerType: 'touch' });
        fireEvent.click(layer, { clientX: 50, clientY: 90 });
        expect(onImageSelect).not.toHaveBeenCalled();
    });

    it('opens nothing when the tap lands on no card at all', () => {
        const { onImageSelect, layer } = setup();
        // Far outside the one card that has a box, and beyond the touch slop.
        tapAt(layer, 5000, 5000);
        expect(onImageSelect).not.toHaveBeenCalled();
    });

    it('does not fire twice for one tap', () => {
        const { onImageSelect, layer } = setup();
        tapAt(layer);
        fireEvent.click(layer, { clientX: 50, clientY: 50 });
        expect(onImageSelect).toHaveBeenCalledTimes(1);
    });

    it('still renders every card as a real button for keyboard use', () => {
        setup();
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });
});

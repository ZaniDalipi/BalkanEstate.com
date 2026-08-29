/**
 * ProgressiveImage — the loading contract.
 *
 * The three states a visitor on a slow phone actually sees (skeleton → blurred
 * placeholder → photo), plus the two ways the fade can go wrong: a cached photo
 * that finished before React was listening, and a `src` that should never have
 * reached the DOM.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressiveImage } from '../components/ui/ProgressiveImage';
import { validateImageSrc } from '../shared/utils/validation';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/belgrade.jpg';

/** jsdom never loads anything, so `complete` has to be staged by hand. */
const stageAsComplete = (naturalWidth: number) => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const currentSrc = vi
        .spyOn(HTMLImageElement.prototype, 'currentSrc', 'get')
        .mockReturnValue(CLOUDINARY);
    const width = vi
        .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
        .mockReturnValue(naturalWidth);
    return () => {
        complete.mockRestore();
        currentSrc.mockRestore();
        width.mockRestore();
    };
};

const shimmerIn = (container: HTMLElement) => container.querySelector('.image-shimmer');

describe('ProgressiveImage', () => {
    it('shows a shimmer and the blurred placeholder until the photo loads', () => {
        const { container } = render(
            <ProgressiveImage src={CLOUDINARY} alt="Belgrade" placeholderSrc="https://img/tiny.jpg" />,
        );

        expect(shimmerIn(container)).toBeInTheDocument();
        expect(container.querySelector('[style*="tiny.jpg"]')).toBeInTheDocument();
        // Present in the DOM but transparent: it has to be there for the
        // browser to start fetching it, and invisible so it does not appear
        // half-decoded over the placeholder.
        expect(screen.getByAltText('Belgrade')).toHaveClass('opacity-0');
    });

    it('fades the photo in and drops the placeholders once it loads', () => {
        const onLoad = vi.fn();
        const { container } = render(
            <ProgressiveImage
                src={CLOUDINARY}
                alt="Belgrade"
                placeholderSrc="https://img/tiny.jpg"
                onLoad={onLoad}
            />,
        );

        fireEvent.load(screen.getByAltText('Belgrade'));

        expect(screen.getByAltText('Belgrade')).toHaveClass('opacity-100');
        expect(shimmerIn(container)).not.toBeInTheDocument();
        expect(container.querySelector('[style*="tiny.jpg"]')).not.toBeInTheDocument();
        expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('shows a photo that was already in the cache', () => {
        // The failure this guards: `onLoad` never fires for an image the
        // browser completed before React attached the handler, so without the
        // ref check the photo stays at `opacity-0` — loaded, painted, and
        // invisible.
        const restore = stageAsComplete(1600);
        const onLoad = vi.fn();

        render(<ProgressiveImage src={CLOUDINARY} alt="Belgrade" onLoad={onLoad} />);

        expect(screen.getByAltText('Belgrade')).toHaveClass('opacity-100');
        expect(onLoad).toHaveBeenCalledTimes(1);
        restore();
    });

    it('treats a completed image with no pixels as a failure', () => {
        // `complete` is also true for an image that finished by failing.
        const restore = stageAsComplete(0);

        render(<ProgressiveImage src={CLOUDINARY} alt="Belgrade" />);

        expect(screen.queryByAltText('Belgrade')).not.toBeInTheDocument();
        restore();
    });

    it('renders the fallback when the photo errors', () => {
        const onError = vi.fn();
        render(
            <ProgressiveImage
                src={CLOUDINARY}
                alt="Belgrade"
                onError={onError}
                fallback={<div>no photo</div>}
            />,
        );

        fireEvent.error(screen.getByAltText('Belgrade'));

        expect(screen.getByText('no photo')).toBeInTheDocument();
        expect(screen.queryByAltText('Belgrade')).not.toBeInTheDocument();
        expect(onError).toHaveBeenCalledTimes(1);
    });

    it('never puts a non-http src in the DOM', () => {
        render(
            <ProgressiveImage
                src={'javascript:alert(1)'}
                alt="Belgrade"
                fallback={<div>no photo</div>}
            />,
        );

        expect(screen.getByText('no photo')).toBeInTheDocument();
        expect(screen.queryByAltText('Belgrade')).not.toBeInTheDocument();
    });

    it('re-enters the loading state when the src changes', () => {
        const { container, rerender } = render(<ProgressiveImage src={CLOUDINARY} alt="Belgrade" />);
        fireEvent.load(screen.getByAltText('Belgrade'));
        expect(shimmerIn(container)).not.toBeInTheDocument();

        rerender(
            <ProgressiveImage src="https://res.cloudinary.com/demo/image/upload/v1/ohrid.jpg" alt="Ohrid" />,
        );

        // Stored as the URL it belongs to, so the previous photo's success does
        // not vouch for the new one and no effect is needed to reset it.
        expect(shimmerIn(container)).toBeInTheDocument();
        expect(screen.getByAltText('Ohrid')).toHaveClass('opacity-0');
    });

    it('loads eagerly at high priority only when asked', () => {
        const { rerender } = render(<ProgressiveImage src={CLOUDINARY} alt="Belgrade" priority />);

        const priorityImg = screen.getByAltText('Belgrade');
        expect(priorityImg).toHaveAttribute('loading', 'eager');
        expect(priorityImg).toHaveAttribute('fetchpriority', 'high');

        rerender(<ProgressiveImage src={CLOUDINARY} alt="Belgrade" />);

        expect(screen.getByAltText('Belgrade')).toHaveAttribute('loading', 'lazy');
        expect(screen.getByAltText('Belgrade')).toHaveAttribute('fetchpriority', 'auto');
    });
});

describe('validateImageSrc', () => {
    it('accepts an https photo URL', () => {
        expect(validateImageSrc(CLOUDINARY).isValid).toBe(true);
    });

    it('rejects a scheme that is not http(s)', () => {
        expect(validateImageSrc('javascript:alert(1)').isValid).toBe(false);
        expect(validateImageSrc('data:image/png;base64,AAAA').isValid).toBe(false);
    });

    it('rejects control characters the URL parser would silently strip', () => {
        // `new URL` drops the newline and reports a clean URL, which is exactly
        // why this check cannot be left to `validateUrl` alone.
        expect(validateImageSrc('https://res.cloudinary.com/a\n/b.jpg').isValid).toBe(false);
    });

    it('rejects an empty value', () => {
        expect(validateImageSrc('').isValid).toBe(false);
    });
});

describe('optimizeCloudinaryUrl blur', () => {
    it('bakes the blur into the transform segment', () => {
        const url = optimizeCloudinaryUrl(CLOUDINARY, { width: 40, quality: 'auto:eco', blur: 400 });

        expect(url).toContain('e_blur:400');
        expect(url).toContain('w_40');
    });

    it('clamps and ignores nonsense rather than writing it into the URL', () => {
        expect(optimizeCloudinaryUrl(CLOUDINARY, { blur: 99999 })).toContain('e_blur:2000');
        expect(optimizeCloudinaryUrl(CLOUDINARY, { blur: 0 })).not.toContain('e_blur');
        expect(optimizeCloudinaryUrl(CLOUDINARY, { blur: NaN })).not.toContain('e_blur');
        expect(
            optimizeCloudinaryUrl(CLOUDINARY, { blur: '400/../evil' as unknown as number }),
        ).not.toContain('e_blur');
    });

    it('leaves the URL unblurred when no blur is asked for', () => {
        expect(optimizeCloudinaryUrl(CLOUDINARY, { width: 640 })).not.toContain('e_blur');
    });
});

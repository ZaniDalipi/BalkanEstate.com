import { describe, expect, it } from 'vitest';
import { photoLabels } from './photoLabels';

const room = (tag: string) => ({ living_room: 'Living room', bedroom: 'Bedroom', kitchen: 'Kitchen' })[tag] ?? tag;
const photo = (n: number) => `Photo ${n}`;

describe('photoLabels', () => {
  it('names each photo after its room, numbering rooms that appear twice', () => {
    const labels = photoLabels(
      [{ url: 'a', tag: 'living_room' }, { url: 'b', tag: 'bedroom' }, { url: 'c', tag: 'kitchen' }, { url: 'd', tag: 'bedroom' }],
      room,
      photo
    );
    expect(labels).toEqual(['Living room', 'Bedroom 1', 'Kitchen', 'Bedroom 2']);
  });

  it('falls back to "Photo n" (by position) for untagged or "other" photos', () => {
    expect(photoLabels([{ url: 'a' }, { url: 'b', tag: 'other' }, { url: 'c', tag: 'kitchen' }], room, photo)).toEqual(['Photo 1', 'Photo 2', 'Kitchen']);
  });
});

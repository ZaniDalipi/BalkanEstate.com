/**
 * A person's face is generated in two places: the browser draws it, and the
 * server stores it on the user so every surface reads one saved character
 * instead of re-deriving one from whichever id its payload happened to carry.
 *
 * The two generators are copies — the backend builds and deploys on its own, so
 * it cannot import the component. This is what keeps them honest: if either
 * side's option pools, hash or pick order drift, the stored face stops matching
 * the drawn one and everybody's avatar silently changes on their next login.
 */

import { describe, it, expect } from 'vitest';
import { generateAvatarOptionsFromSeed as generateInBrowser } from '@/components/shared/DefaultAvatar';
import {
    generateAvatarOptionsFromSeed as generateOnServer,
    defaultAvatarOptionsForUser,
} from '../../backend/src/utils/defaultAvatar';

// Real-shaped ObjectIds plus the edge cases: empty, one char, unicode.
const SEEDS = [
    '507f1f77bcf86cd799439011',
    '6512a3f4e8b9c1d2f3a4b5c6',
    'ZSc4mXjMTNn4qKZ7',
    'a',
    '',
    'Kamelahoxhallari85',
];

describe('the browser and the server draw the same face', () => {
    for (const gender of ['male', 'female', 'other', undefined] as const) {
        it(`agrees for every seed (gender: ${gender ?? 'unset'})`, () => {
            for (const seed of SEEDS) {
                expect(generateOnServer(seed, gender)).toEqual(generateInBrowser(seed, gender));
            }
        });
    }

    it('stores exactly what the browser would have drawn for that user', () => {
        const userId = '507f1f77bcf86cd799439011';

        expect(JSON.parse(defaultAvatarOptionsForUser(userId, 'female')))
            .toEqual(generateInBrowser(userId, 'female'));
    });

    it('still gives two different people two different faces', () => {
        expect(generateOnServer('507f1f77bcf86cd799439011'))
            .not.toEqual(generateOnServer('6512a3f4e8b9c1d2f3a4b5c6'));
    });
});

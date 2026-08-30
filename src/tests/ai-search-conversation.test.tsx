/**
 * The AI search conversation: gather first, search last.
 *
 * The buyer describes what they want over a few turns. Nothing is searched and
 * no swipe deck appears until they say they are done — or press "Show me the
 * matches" themselves. Previously the first sentence ran the search, which
 * moved the results list and the map out from under them mid-conversation.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Property, AiSearchQuery, ChatMessage } from '@/types';

vi.mock('react-i18next', () => ({
    initReactI18next: { type: '3rdParty', init: () => {} },
    useTranslation: () => ({
        t: (key: string, options?: unknown) => {
            if (typeof options === 'string') return options;
            if (options && typeof options === 'object') {
                const opts = options as { defaultValue?: string; count?: number };
                if (opts.defaultValue) return opts.defaultValue.replace('{{count}}', String(opts.count ?? ''));
            }
            return key;
        },
    }),
}));

vi.mock('@/services/geminiService', () => ({ getAiChatResponse: vi.fn() }));
vi.mock('@/shared/utils/pwa', () => ({ shouldOpenInNewTab: () => false }));
vi.mock('@/src/features/search/components/AiMessageLimitModal', () => ({ default: () => null }));

const dispatch = vi.fn();
const toggleSavedHome = vi.fn();
vi.mock('@/context/AppContext', () => ({
    useAppContext: () => ({
        state: { savedHomes: [], isAuthenticated: true },
        dispatch,
        toggleSavedHome,
    }),
}));

import AiSearch from '@/src/features/search/components/AiSearch';
import { getAiChatResponse } from '@/services/geminiService';

const mockChat = vi.mocked(getAiChatResponse);

const makeProperty = (id: string, city: string, country: string): Property => ({
    id,
    title: `Home ${id}`,
    sellerId: 's',
    listingType: 'sale',
    status: 'active',
    price: 120000,
    address: 'Rr. 1',
    city,
    country,
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 80,
    yearBuilt: 2015,
    parking: 1,
    description: '',
    specialFeatures: [],
    materials: [],
    amenities: [],
    imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/${id}.jpg`,
    images: [],
    lat: 42.6,
    lng: 21,
    seller: { id: 's', name: 'S', type: 'agent' },
    propertyType: 'apartment',
} as unknown as Property);

const KOSOVO = [
    makeProperty('k1', 'Pristina', 'Kosovo'),
    makeProperty('k2', 'Prizren', 'Kosovo'),
    makeProperty('k3', 'Peja', 'Kosovo'),
];

/** Renders AiSearch with a chat history that it owns, like the real page does. */
function renderAiSearch(properties: Property[] = KOSOVO) {
    const onApplyFilters = vi.fn();
    function Harness() {
        const [history, setHistory] = React.useState<ChatMessage[]>([]);
        return (
            <AiSearch
                properties={properties}
                onApplyFilters={onApplyFilters}
                isMobile={false}
                history={history}
                onHistoryChange={setHistory}
            />
        );
    }
    render(<Harness />);
    return { onApplyFilters };
}

async function say(text: string) {
    fireEvent.change(screen.getByPlaceholderText('ai.placeholder'), { target: { value: text } });
    fireEvent.click(screen.getByLabelText('Send message'));
}

const criteriaPanel = () => screen.queryByTestId('ai-criteria-panel');
const deck = () => screen.queryByTestId('swipe-progress');

describe('AI search conversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.speechSynthesis = undefined as unknown as SpeechSynthesis;
    });

    it('does not search on the first sentence — it asks a question instead', async () => {
        // The exact reported turn.
        mockChat.mockResolvedValueOnce({
            responseMessage: 'Here are all properties available in Kosovo! Would you like to narrow down the search by city, price range, or property type?',
            searchQuery: { country: 'Kosovo' } as AiSearchQuery,
            isFinalQuery: true,
        });
        const { onApplyFilters } = renderAiSearch();

        await say('property in Kosov');

        await waitFor(() => expect(criteriaPanel()).toBeInTheDocument());
        expect(onApplyFilters).not.toHaveBeenCalled();
        expect(deck()).not.toBeInTheDocument();
    });

    it('shows the criteria gathered so far while it keeps asking', async () => {
        mockChat.mockResolvedValueOnce({
            responseMessage: 'Kosovo it is! Do you have a city in mind?',
            searchQuery: { country: 'Kosovo' } as AiSearchQuery,
            isFinalQuery: false,
        });
        renderAiSearch();

        await say('property in Kosovo');

        await waitFor(() => expect(criteriaPanel()).toBeInTheDocument());
        // The country pill, not the buyer's own message which also says "Kosovo".
        expect(within(criteriaPanel()!).getByText(/Kosovo/)).toBeInTheDocument();
    });

    it('keeps the criteria when a later turn returns nothing useful', async () => {
        mockChat
            .mockResolvedValueOnce({
                responseMessage: 'Kosovo it is! Do you have a city in mind?',
                searchQuery: { country: 'Kosovo' } as AiSearchQuery,
                isFinalQuery: false,
            })
            .mockResolvedValueOnce({
                responseMessage: 'Hello again! What are you after?',
                searchQuery: null,
                isFinalQuery: false,
            });
        renderAiSearch();

        await say('property in Kosovo');
        await waitFor(() => expect(criteriaPanel()).toBeInTheDocument());

        await say('hi');
        await waitFor(() => expect(screen.getByText('Hello again! What are you after?')).toBeInTheDocument());
        expect(criteriaPanel()).toBeInTheDocument();
    });

    it('searches and deals the deck once the buyer says they are done', async () => {
        mockChat
            .mockResolvedValueOnce({
                responseMessage: 'Kosovo it is! Do you have a city in mind?',
                searchQuery: { country: 'Kosovo' } as AiSearchQuery,
                isFinalQuery: false,
            })
            .mockResolvedValueOnce({
                responseMessage: 'Here is everything I have in Kosovo — swipe through them.',
                searchQuery: { country: 'Kosovo' } as AiSearchQuery,
                isFinalQuery: true,
            });
        const { onApplyFilters } = renderAiSearch();

        await say('property in Kosovo');
        await waitFor(() => expect(criteriaPanel()).toBeInTheDocument());
        expect(onApplyFilters).not.toHaveBeenCalled();

        await say("that's it");

        await waitFor(() => expect(deck()).toBeInTheDocument());
        expect(onApplyFilters).toHaveBeenCalledWith({ country: 'Kosovo' });
        expect(screen.getByTestId('swipe-progress').textContent).toBe('1 / 3');
    });

    it('lets the buyer end the conversation with the button instead', async () => {
        mockChat.mockResolvedValueOnce({
            responseMessage: 'Kosovo it is! Do you have a city in mind?',
            searchQuery: { country: 'Kosovo' } as AiSearchQuery,
            isFinalQuery: false,
        });
        const { onApplyFilters } = renderAiSearch();

        await say('property in Kosovo');
        await waitFor(() => expect(criteriaPanel()).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Show me the matches/ }));

        await waitFor(() => expect(deck()).toBeInTheDocument());
        expect(onApplyFilters).toHaveBeenCalledWith({ country: 'Kosovo' });
    });

    it('hides the criteria panel once the search has run', async () => {
        mockChat.mockResolvedValueOnce({
            responseMessage: 'Here is everything I have in Kosovo.',
            searchQuery: { country: 'Kosovo' } as AiSearchQuery,
            isFinalQuery: true,
        });
        renderAiSearch();

        await say('show me everything in Kosovo');

        await waitFor(() => expect(deck()).toBeInTheDocument());
        expect(criteriaPanel()).not.toBeInTheDocument();
    });

    it('goes back to gathering when the buyer refines after results', async () => {
        mockChat
            .mockResolvedValueOnce({
                responseMessage: 'Here is everything I have in Kosovo.',
                searchQuery: { country: 'Kosovo' } as AiSearchQuery,
                isFinalQuery: true,
            })
            .mockResolvedValueOnce({
                responseMessage: 'Sure — what is your budget?',
                searchQuery: { country: 'Kosovo', propertyType: 'apartment' } as AiSearchQuery,
                isFinalQuery: false,
            });
        renderAiSearch();

        await say('show me everything in Kosovo');
        await waitFor(() => expect(deck()).toBeInTheDocument());

        await say('only apartments');

        await waitFor(() => expect(criteriaPanel()).toBeInTheDocument());
        expect(deck()).not.toBeInTheDocument();
    });
});

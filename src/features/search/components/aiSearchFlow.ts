/**
 * When the assistant's answer should actually run a search.
 *
 * The assistant gathers criteria over several turns and the search only runs
 * once the buyer says they are done. The model is told this, but a model that
 * slips and returns `isFinalQuery: true` alongside "would you like to narrow it
 * down?" used to fire the search on the buyer's very first sentence — the
 * results list and the map jumped before they had finished describing what they
 * wanted. These checks make the rule hold in code rather than on trust.
 */
import type { AiSearchQuery } from '@/types';

/** Fields that count as a real search criterion. `features` is an array. */
const CRITERIA_KEYS: Array<keyof AiSearchQuery> = [
    'location', 'country', 'minPrice', 'maxPrice', 'beds', 'baths',
    'livingRooms', 'minSqft', 'maxSqft', 'propertyType', 'sellerType', 'features',
];

/** Latin/CJK question marks. Greek is handled separately — see below. */
const QUESTION_MARKS = ['?', '？'];
/** Greek ends a question with a semicolon: U+003B, or U+037E on a Greek keyboard. */
const GREEK_QUESTION_MARKS = [';', ';'];
const GREEK_LETTERS = /[Ͱ-Ͽἀ-῿]/;

export function hasSearchCriteria(query: AiSearchQuery | null | undefined): boolean {
    if (!query) return false;
    return CRITERIA_KEYS.some(key => {
        const value = query[key];
        if (value === null || value === undefined || value === '') return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    });
}

/**
 * True when the assistant is still asking the buyer something.
 *
 * Only the tail of the message counts: a mark in the middle of a longer
 * statement is not what the message is for. A semicolon only counts as a
 * question mark when the message is actually in Greek, so an English sentence
 * that happens to end in one is not mistaken for a question.
 */
export function looksLikeQuestion(message: string | null | undefined): boolean {
    if (!message) return false;
    const trimmed = message.trim();
    if (!trimmed) return false;

    const marks = GREEK_LETTERS.test(trimmed)
        ? [...QUESTION_MARKS, ...GREEK_QUESTION_MARKS]
        : QUESTION_MARKS;

    // Look only at the tail, so trailing decoration (an emoji, a closing quote)
    // after the mark still reads as a question.
    const tail = trimmed.slice(-24);
    const lastMark = Math.max(...marks.map(mark => tail.lastIndexOf(mark)));
    if (lastMark === -1) return false;

    // Anything of substance after the mark means the message moved on from it.
    return !/\p{L}|\p{N}/u.test(tail.slice(lastMark + 1));
}

export interface AiTurn {
    responseMessage: string;
    searchQuery: AiSearchQuery | null;
    isFinalQuery: boolean;
}

/**
 * The search runs only when the assistant says the buyer is done AND is not
 * still asking them something. A buyer held back by the second check is never
 * stuck: the composer always offers "Show me the matches".
 *
 * An empty (but present) query is a legitimate "show me everything".
 */
export function shouldRunSearch(turn: AiTurn): boolean {
    if (!turn.isFinalQuery) return false;
    if (!turn.searchQuery) return false;
    return !looksLikeQuestion(turn.responseMessage);
}

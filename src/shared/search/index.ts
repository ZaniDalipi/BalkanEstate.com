export {
  foldText,
  foldWithOffsets,
  isStopWord,
  tokenize,
  tokenizeQuery,
  type FoldedWithOffsets,
} from './text';
export { boundedEditDistance, fuzzyPrefixDistance, isFuzzyMatch, typoBudget } from './fuzzy';
export {
  matchTerm,
  matchTermAcrossFields,
  type FieldMatch,
  type MatchTier,
  type TermMatch,
  type WeightedField,
} from './match';
export {
  createSearchIndex,
  searchDocuments,
  type SearchField,
  type SearchIndex,
  type SearchIndexOptions,
  type SearchOptions,
  type SearchResult,
} from './engine';
export {
  parseSearchQuery,
  type ParsedListingType,
  type ParsedPropertyType,
  type ParsedQuery,
  type QueryIntent,
} from './parseQuery';
export {
  highlightRanges,
  splitHighlights,
  type HighlightPart,
  type HighlightRange,
} from './highlight';
export {
  createPropertyMatcher,
  matchesPropertyQuery,
  rankProperties,
  sortByRelevance,
  type PropertyMatcher,
  type RankPropertiesOptions,
} from './properties';

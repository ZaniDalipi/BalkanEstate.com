// Property State - Property browsing, search, and management
// Pure state definition with actions (MVI pattern)

import { Property } from '../../../../domain/entities/Property';
import { PropertyFilters } from '../../../../domain/entities/PropertyFilters';
import { SavedSearch } from '../../../../domain/entities/SavedSearch';

export type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
};

export class SearchPageState {
  constructor(
    public readonly filters: PropertyFilters = PropertyFilters.getDefault(),
    public readonly activeFilters: PropertyFilters = PropertyFilters.getDefault(),
    public readonly mapBoundsJSON: string | null = null,
    public readonly drawnBoundsJSON: string | null = null,
    public readonly mobileView: 'map' | 'list' = 'map',
    public readonly searchMode: 'manual' | 'ai' = 'manual',
    public readonly aiChatHistory: ChatMessage[] = [{
      sender: 'ai',
      text: "Hello! Welcome to Balkan Estate. How can I help you find a property today?"
    }],
    public readonly isAiChatModalOpen: boolean = false,
    public readonly isFiltersOpen: boolean = false,
    public readonly focusMapOnProperty: { lat: number; lng: number; address: string } | null = null
  ) {}

  static getDefault(): SearchPageState {
    return new SearchPageState();
  }
}

export class PropertyState {
  constructor(
    public readonly properties: Property[] = [],
    public readonly isLoadingProperties: boolean = false,
    public readonly propertiesError: string | null = null,
    public readonly selectedProperty: Property | null = null,
    public readonly propertyToEdit: Property | null = null,
    public readonly savedHomes: Property[] = [],
    public readonly savedSearches: SavedSearch[] = [],
    public readonly comparisonList: string[] = [],
    public readonly searchPageState: SearchPageState = SearchPageState.getDefault(),
    public readonly pendingProperty: Property | null = null
  ) {}

  static getInitialState(): PropertyState {
    return new PropertyState();
  }
}

// Actions - User intents for properties
export type PropertyAction =
  | { type: 'PROPERTIES_LOADING' }
  | { type: 'PROPERTIES_SUCCESS'; payload: Property[] }
  | { type: 'PROPERTIES_ERROR'; payload: string }
  | { type: 'SET_SELECTED_PROPERTY'; payload: string | null }
  | { type: 'SET_PROPERTY_TO_EDIT'; payload: Property | null }
  | { type: 'ADD_PROPERTY'; payload: Property }
  | { type: 'UPDATE_PROPERTY'; payload: Property }
  | { type: 'DELETE_PROPERTY'; payload: string }
  | { type: 'RENEW_PROPERTY'; payload: string }
  | { type: 'MARK_PROPERTY_SOLD'; payload: string }
  | { type: 'TOGGLE_SAVED_HOME'; payload: Property }
  | { type: 'SET_SAVED_HOMES'; payload: Property[] }
  | { type: 'ADD_SAVED_SEARCH'; payload: SavedSearch }
  | { type: 'REMOVE_SAVED_SEARCH'; payload: string }
  | { type: 'SET_SAVED_SEARCHES'; payload: SavedSearch[] }
  | { type: 'UPDATE_SAVED_SEARCH_ACCESS_TIME'; payload: string }
  | { type: 'ADD_TO_COMPARISON'; payload: string }
  | { type: 'REMOVE_FROM_COMPARISON'; payload: string }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'UPDATE_SEARCH_PAGE_STATE'; payload: Partial<SearchPageState> }
  | { type: 'SET_PENDING_PROPERTY'; payload: Property | null };

// Reducer
export function propertyReducer(state: PropertyState, action: PropertyAction): PropertyState {
  switch (action.type) {
    case 'PROPERTIES_LOADING':
      return new PropertyState(
        state.properties,
        true,
        null,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'PROPERTIES_SUCCESS':
      return new PropertyState(
        action.payload,
        false,
        null,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'PROPERTIES_ERROR':
      return new PropertyState(
        state.properties,
        false,
        action.payload,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'SET_SELECTED_PROPERTY':
      const selected = action.payload
        ? state.properties.find(p => p.id === action.payload) || null
        : null;
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        selected,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'SET_PROPERTY_TO_EDIT':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        action.payload,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'ADD_PROPERTY':
      return new PropertyState(
        [action.payload, ...state.properties],
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'UPDATE_PROPERTY':
      return new PropertyState(
        state.properties.map(p => p.id === action.payload.id ? action.payload : p),
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'DELETE_PROPERTY':
      return new PropertyState(
        state.properties.filter(p => p.id !== action.payload),
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'RENEW_PROPERTY':
      return new PropertyState(
        state.properties.map(p =>
          p.id === action.payload
            ? Property.fromDTO({ ...p.toDTO(), lastRenewed: Date.now() })
            : p
        ),
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'MARK_PROPERTY_SOLD':
      return new PropertyState(
        state.properties.map(p =>
          p.id === action.payload
            ? Property.fromDTO({ ...p.toDTO(), status: 'sold', soldAt: Date.now() })
            : p
        ),
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'TOGGLE_SAVED_HOME':
      const isSaved = state.savedHomes.some(p => p.id === action.payload.id);
      const newSavedHomes = isSaved
        ? state.savedHomes.filter(p => p.id !== action.payload.id)
        : [action.payload, ...state.savedHomes];
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        newSavedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'SET_SAVED_HOMES':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        action.payload,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'ADD_SAVED_SEARCH':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        [action.payload, ...state.savedSearches],
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'REMOVE_SAVED_SEARCH':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches.filter(s => s.id !== action.payload),
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'SET_SAVED_SEARCHES':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        action.payload,
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'UPDATE_SAVED_SEARCH_ACCESS_TIME':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches.map(s =>
          s.id === action.payload
            ? SavedSearch.fromDTO({ ...s.toDTO(), lastAccessed: Date.now() })
            : s
        ),
        state.comparisonList,
        state.searchPageState,
        state.pendingProperty
      );

    case 'ADD_TO_COMPARISON':
      if (state.comparisonList.length < 5 && !state.comparisonList.includes(action.payload)) {
        return new PropertyState(
          state.properties,
          state.isLoadingProperties,
          state.propertiesError,
          state.selectedProperty,
          state.propertyToEdit,
          state.savedHomes,
          state.savedSearches,
          [...state.comparisonList, action.payload],
          state.searchPageState,
          state.pendingProperty
        );
      }
      return state;

    case 'REMOVE_FROM_COMPARISON':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList.filter(id => id !== action.payload),
        state.searchPageState,
        state.pendingProperty
      );

    case 'CLEAR_COMPARISON':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        [],
        state.searchPageState,
        state.pendingProperty
      );

    case 'UPDATE_SEARCH_PAGE_STATE':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        new SearchPageState(
          action.payload.filters ?? state.searchPageState.filters,
          action.payload.activeFilters ?? state.searchPageState.activeFilters,
          action.payload.mapBoundsJSON ?? state.searchPageState.mapBoundsJSON,
          action.payload.drawnBoundsJSON ?? state.searchPageState.drawnBoundsJSON,
          action.payload.mobileView ?? state.searchPageState.mobileView,
          action.payload.searchMode ?? state.searchPageState.searchMode,
          action.payload.aiChatHistory ?? state.searchPageState.aiChatHistory,
          action.payload.isAiChatModalOpen ?? state.searchPageState.isAiChatModalOpen,
          action.payload.isFiltersOpen ?? state.searchPageState.isFiltersOpen,
          action.payload.focusMapOnProperty ?? state.searchPageState.focusMapOnProperty
        ),
        state.pendingProperty
      );

    case 'SET_PENDING_PROPERTY':
      return new PropertyState(
        state.properties,
        state.isLoadingProperties,
        state.propertiesError,
        state.selectedProperty,
        state.propertyToEdit,
        state.savedHomes,
        state.savedSearches,
        state.comparisonList,
        state.searchPageState,
        action.payload
      );

    default:
      return state;
  }
}

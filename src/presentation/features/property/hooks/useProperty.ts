// useProperty Hook - Connects property use cases to UI
// Custom hook that uses domain use cases for property operations

import { useCallback } from 'react';
import { usePropertyContext } from '../state/PropertyContext';
import { GetPropertiesUseCase, CreatePropertyUseCase, UpdatePropertyUseCase, DeletePropertyUseCase } from '../../../../domain/usecases/property';
import { propertyRepository } from '../../../../data/repositories/PropertyRepository';
import { userRepository } from '../../../../data/repositories/UserRepository';
import { Property } from '../../../../domain/entities/Property';
import { PropertyFilters } from '../../../../domain/entities/PropertyFilters';
import { SavedSearch } from '../../../../domain/entities/SavedSearch';
import { SearchPageState } from '../state/PropertyState';

// Initialize use cases
const getPropertiesUseCase = new GetPropertiesUseCase(propertyRepository);
const createPropertyUseCase = new CreatePropertyUseCase(propertyRepository);
const updatePropertyUseCase = new UpdatePropertyUseCase(propertyRepository);
const deletePropertyUseCase = new DeletePropertyUseCase(propertyRepository);

export function useProperty() {
  const { state, dispatch } = usePropertyContext();

  const fetchProperties = useCallback(async (filters?: PropertyFilters) => {
    dispatch({ type: 'PROPERTIES_LOADING' });
    try {
      const properties = await getPropertiesUseCase.execute(filters);
      dispatch({ type: 'PROPERTIES_SUCCESS', payload: properties });
    } catch (error: any) {
      dispatch({ type: 'PROPERTIES_ERROR', payload: error.message });
    }
  }, [dispatch]);

  const createProperty = useCallback(async (propertyData: any): Promise<Property> => {
    const property = await createPropertyUseCase.execute(propertyData);
    dispatch({ type: 'ADD_PROPERTY', payload: property });
    return property;
  }, [dispatch]);

  const updateProperty = useCallback(async (propertyId: string, propertyData: any): Promise<Property> => {
    const property = await updatePropertyUseCase.execute(propertyId, propertyData);
    dispatch({ type: 'UPDATE_PROPERTY', payload: property });
    return property;
  }, [dispatch]);

  const deleteProperty = useCallback(async (propertyId: string) => {
    await deletePropertyUseCase.execute(propertyId);
    dispatch({ type: 'DELETE_PROPERTY', payload: propertyId });
  }, [dispatch]);

  const renewProperty = useCallback(async (propertyId: string) => {
    await propertyRepository.renewListing(propertyId);
    dispatch({ type: 'RENEW_PROPERTY', payload: propertyId });
  }, [dispatch]);

  const markPropertyAsSold = useCallback(async (propertyId: string) => {
    await propertyRepository.markAsSold(propertyId);
    dispatch({ type: 'MARK_PROPERTY_SOLD', payload: propertyId });
  }, [dispatch]);

  const toggleSavedHome = useCallback(async (property: Property, userId: string) => {
    await propertyRepository.toggleSavedProperty(userId, property.id);
    dispatch({ type: 'TOGGLE_SAVED_HOME', payload: property });
  }, [dispatch]);

  const loadSavedHomes = useCallback(async (userId: string) => {
    const savedHomes = await propertyRepository.getSavedProperties(userId);
    dispatch({ type: 'SET_SAVED_HOMES', payload: savedHomes });
  }, [dispatch]);

  const addSavedSearch = useCallback(async (userId: string, search: SavedSearch) => {
    const savedSearch = await userRepository.addSavedSearch(userId, {
      name: search.name,
      filters: search.filters.toDTO(),
      drawnBoundsJSON: search.drawnBoundsJSON,
    });
    dispatch({ type: 'ADD_SAVED_SEARCH', payload: savedSearch });
  }, [dispatch]);

  const removeSavedSearch = useCallback(async (userId: string, searchId: string) => {
    await userRepository.deleteSavedSearch(userId, searchId);
    dispatch({ type: 'REMOVE_SAVED_SEARCH', payload: searchId });
  }, [dispatch]);

  const loadSavedSearches = useCallback(async (userId: string) => {
    const savedSearches = await userRepository.getSavedSearches(userId);
    dispatch({ type: 'SET_SAVED_SEARCHES', payload: savedSearches });
  }, [dispatch]);

  const updateSavedSearchAccessTime = useCallback(async (userId: string, searchId: string) => {
    await userRepository.updateSavedSearchAccessTime(userId, searchId);
    dispatch({ type: 'UPDATE_SAVED_SEARCH_ACCESS_TIME', payload: searchId });
  }, [dispatch]);

  const setSelectedProperty = useCallback((propertyId: string | null) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
  }, [dispatch]);

  const setPropertyToEdit = useCallback((property: Property | null) => {
    dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: property });
  }, [dispatch]);

  const addToComparison = useCallback((propertyId: string) => {
    dispatch({ type: 'ADD_TO_COMPARISON', payload: propertyId });
  }, [dispatch]);

  const removeFromComparison = useCallback((propertyId: string) => {
    dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: propertyId });
  }, [dispatch]);

  const clearComparison = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPARISON' });
  }, [dispatch]);

  const updateSearchPageState = useCallback((newState: Partial<SearchPageState>) => {
    dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: newState });
  }, [dispatch]);

  const setPendingProperty = useCallback((property: Property | null) => {
    dispatch({ type: 'SET_PENDING_PROPERTY', payload: property });
  }, [dispatch]);

  return {
    // State
    properties: state.properties,
    isLoadingProperties: state.isLoadingProperties,
    propertiesError: state.propertiesError,
    selectedProperty: state.selectedProperty,
    propertyToEdit: state.propertyToEdit,
    savedHomes: state.savedHomes,
    savedSearches: state.savedSearches,
    comparisonList: state.comparisonList,
    searchPageState: state.searchPageState,
    pendingProperty: state.pendingProperty,

    // Actions
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    renewProperty,
    markPropertyAsSold,
    toggleSavedHome,
    loadSavedHomes,
    addSavedSearch,
    removeSavedSearch,
    loadSavedSearches,
    updateSavedSearchAccessTime,
    setSelectedProperty,
    setPropertyToEdit,
    addToComparison,
    removeFromComparison,
    clearComparison,
    updateSearchPageState,
    setPendingProperty,
  };
}

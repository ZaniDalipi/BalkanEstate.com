// Property Hooks - Barrel export
// Centralized exports for all property-related hooks

export { useProperties } from './useProperties';
export { useProperty } from './useProperty';
export { useCreateProperty } from './useCreateProperty';
export { useUpdateProperty } from './useUpdateProperty';
export { useDeleteProperty } from './useDeleteProperty';
export { useMyListings } from './useMyListings';
export { useFavorites, useToggleFavorite } from './useFavorites';
export {
  useMarkPropertyAsSold,
  usePromoteProperty,
  useUploadPropertyImages,
} from './usePropertyActions';

// Real-time WebSocket updates
export {
  useRealtimeProperties,
  useEnableRealtimeProperties,
} from './useRealtimeProperties';

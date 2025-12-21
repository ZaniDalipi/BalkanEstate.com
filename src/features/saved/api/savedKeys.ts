// Saved Items Query Keys Factory
// Centralized query key management for saved searches and homes

export const savedKeys = {
  all: ['saved'] as const,
  searches: () => [...savedKeys.all, 'searches'] as const,
  homes: () => [...savedKeys.all, 'homes'] as const,
} as const;

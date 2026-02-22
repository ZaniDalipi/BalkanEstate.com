// Features barrel export
// Provides a unified import point for all feature modules
//
// NOTE: Some features have overlapping export names (e.g., leaveAgency, updateUser).
// We comment out the conflicting modules; import directly from them when needed.

// Core Features
export * from './auth';
export * from './properties';
export * from './agencies';
// agents has overlapping exports with agencies (leaveAgency) - import directly from agents when needed
// export * from './agents';

// User Features
export * from './saved';
export * from './conversations';
export * from './messaging';
export * from './comparison';

// Search & Display
export * from './search';
export * from './property-details';
export * from './map';

// Seller Features
export * from './seller';
export * from './promotions';
export * from './calculators';

// Discovery
export * from './cities';
export * from './analytics';
// export * from './view-stats';

// Admin & System - admin has overlapping exports with auth (updateUser) - import directly when needed
// export * from './admin';
export * from './onboarding';
export * from './payments';

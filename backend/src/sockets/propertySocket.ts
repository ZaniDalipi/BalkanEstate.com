import { Server } from 'socket.io';
import mongoose from 'mongoose';

// Store the io instance for emitting from controllers
let ioInstance: Server | null = null;
let changeStreamActive = false;

/**
 * Property Socket Module
 *
 * Provides real-time property updates using:
 * 1. MongoDB Change Streams - for database-level changes (requires replica set)
 * 2. Manual emit functions - for controller-triggered events (always works)
 *
 * Events:
 * - property:created - New property listing added
 * - property:updated - Property details changed
 * - property:deleted - Property removed
 * - property:statusChanged - Property status changed (sold, available, etc.)
 *
 * NOTE: Change Streams require MongoDB replica set. If not available,
 * real-time updates still work via manual emit functions from controllers.
 */

export const setupPropertySocket = (io: Server) => {
  ioInstance = io;

  console.log('🏠 Property socket initialized');

  // Try to setup MongoDB Change Stream (optional - requires replica set)
  setupChangeStream();
};

/**
 * Setup MongoDB Change Stream to watch for property changes
 * This provides true real-time updates directly from MongoDB
 * NOTE: Requires MongoDB replica set - will fail gracefully on standalone
 */
const setupChangeStream = async () => {
  try {
    // Wait for MongoDB connection to be ready
    if (mongoose.connection.readyState !== 1) {
      mongoose.connection.once('connected', () => {
        initializeChangeStream();
      });
    } else {
      initializeChangeStream();
    }
  } catch (error) {
    console.warn('⚠️ Change streams not available. Using controller-triggered events only.');
  }
};

const initializeChangeStream = async () => {
  try {
    // Check if we're connected to a replica set
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('⚠️ Database not ready for change streams');
      return;
    }

    // Try to get admin info to check replica set status
    try {
      const admin = db.admin();
      const serverStatus = await admin.serverStatus();

      // Check if replication is available
      if (!serverStatus.repl) {
        console.log('ℹ️ MongoDB running in standalone mode - Change Streams require replica set');
        console.log('ℹ️ Real-time updates will use controller-triggered events instead');
        return;
      }
    } catch {
      // Can't check server status - try anyway
    }

    const collection = mongoose.connection.collection('properties');

    // Watch for changes with full document on updates
    const changeStream = collection.watch(
      [
        {
          $match: {
            operationType: { $in: ['insert', 'update', 'replace', 'delete'] }
          }
        }
      ],
      {
        fullDocument: 'updateLookup'
      }
    );

    // Use async iterator pattern (more reliable)
    changeStreamActive = true;
    console.log('✅ Property MongoDB Change Stream active');

    // Handle changes using event emitter pattern
    changeStream.on('change', (change: any) => {
      handlePropertyChange(change);
    });

    changeStream.on('error', (error: any) => {
      console.error('❌ Property change stream error:', error.message || error);
      changeStreamActive = false;

      // Don't retry if it's a "not replica set" error
      if (error.message?.includes('replica set') || error.code === 40573) {
        console.log('ℹ️ Change Streams not supported - using controller events only');
        return;
      }

      // Attempt to restart the change stream after a delay for other errors
      setTimeout(() => {
        console.log('🔄 Attempting to restart property change stream...');
        initializeChangeStream();
      }, 10000);
    });

    changeStream.on('close', () => {
      changeStreamActive = false;
      console.log('ℹ️ Property change stream closed');
    });

  } catch (error: any) {
    // Gracefully handle if change streams aren't supported
    const errorMessage = error?.message || String(error);

    if (errorMessage.includes('replica set') ||
        errorMessage.includes('not supported') ||
        errorMessage.includes('$changeStream') ||
        error?.code === 40573) {
      console.log('ℹ️ MongoDB Change Streams not available (requires replica set)');
      console.log('ℹ️ Real-time updates will use controller-triggered events');
    } else {
      console.warn('⚠️ Could not initialize change stream:', errorMessage);
    }
  }
};

/**
 * Handle property change events from MongoDB Change Stream
 */
const handlePropertyChange = (change: any) => {
  if (!ioInstance) return;

  const { operationType, fullDocument, documentKey } = change;
  const propertyId = documentKey?._id?.toString();

  switch (operationType) {
    case 'insert':
      if (fullDocument) {
        const property = transformProperty(fullDocument);
        ioInstance.emit('property:created', {
          property,
          timestamp: new Date().toISOString(),
        });
        console.log(`📤 [ChangeStream] property:created for ${propertyId}`);
      }
      break;

    case 'update':
    case 'replace':
      if (fullDocument) {
        const property = transformProperty(fullDocument);
        ioInstance.emit('property:updated', {
          propertyId,
          property,
          timestamp: new Date().toISOString(),
        });
        console.log(`📤 [ChangeStream] property:updated for ${propertyId}`);
      }
      break;

    case 'delete':
      ioInstance.emit('property:deleted', {
        propertyId,
        timestamp: new Date().toISOString(),
      });
      console.log(`📤 [ChangeStream] property:deleted for ${propertyId}`);
      break;
  }
};

/**
 * Transform MongoDB document to frontend-compatible format
 */
const transformProperty = (doc: any) => {
  if (!doc) return null;

  return {
    id: doc._id?.toString(),
    ...doc,
    _id: undefined,
  };
};

// ============================================================================
// MANUAL EMIT FUNCTIONS - Call these from controllers for immediate updates
// These work regardless of whether Change Streams are available
// ============================================================================

/**
 * Emit property created event
 * Call this from propertyController after successful creation
 */
export const emitPropertyCreated = (property: any) => {
  if (!ioInstance) return;

  const transformed = transformProperty(property);
  ioInstance.emit('property:created', {
    property: transformed,
    propertyId: transformed?.id,
    timestamp: new Date().toISOString(),
  });
  console.log(`📤 [Controller] property:created for ${transformed?.id}`);
};

/**
 * Emit property updated event
 * Call this from propertyController after successful update
 */
export const emitPropertyUpdated = (propertyId: string, property: any) => {
  if (!ioInstance) return;

  ioInstance.emit('property:updated', {
    propertyId,
    property: transformProperty(property),
    timestamp: new Date().toISOString(),
  });
  console.log(`📤 [Controller] property:updated for ${propertyId}`);
};

/**
 * Emit property deleted event
 * Call this from propertyController after successful deletion
 */
export const emitPropertyDeleted = (propertyId: string) => {
  if (!ioInstance) return;

  ioInstance.emit('property:deleted', {
    propertyId,
    timestamp: new Date().toISOString(),
  });
  console.log(`📤 [Controller] property:deleted for ${propertyId}`);
};

/**
 * Emit property status changed event (sold, available, pending, etc.)
 */
export const emitPropertyStatusChanged = (propertyId: string, status: string, property?: any) => {
  if (!ioInstance) return;

  ioInstance.emit('property:statusChanged', {
    propertyId,
    status,
    property: property ? transformProperty(property) : undefined,
    timestamp: new Date().toISOString(),
  });
  console.log(`📤 [Controller] property:statusChanged for ${propertyId} -> ${status}`);
};

/**
 * Emit bulk property update (for batch operations)
 */
export const emitPropertiesBulkUpdate = (action: 'created' | 'updated' | 'deleted', count: number) => {
  if (!ioInstance) return;

  ioInstance.emit('property:bulkUpdate', {
    action,
    count,
    timestamp: new Date().toISOString(),
  });
  console.log(`📤 [Controller] property:bulkUpdate - ${action} ${count} properties`);
};

/**
 * Check if change stream is active
 */
export const isChangeStreamActive = () => changeStreamActive;

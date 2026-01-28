import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Property from '../models/Property';

// Store the io instance for emitting from controllers
let ioInstance: Server | null = null;

/**
 * Property Socket Module
 *
 * Provides real-time property updates using:
 * 1. MongoDB Change Streams - for database-level changes
 * 2. Manual emit functions - for controller-triggered events
 *
 * Events:
 * - property:created - New property listing added
 * - property:updated - Property details changed
 * - property:deleted - Property removed
 * - property:statusChanged - Property status changed (sold, available, etc.)
 */

export const setupPropertySocket = (io: Server) => {
  ioInstance = io;

  console.log('🏠 Property socket initialized');

  // Setup MongoDB Change Stream for real-time database updates
  setupChangeStream();
};

/**
 * Setup MongoDB Change Stream to watch for property changes
 * This provides true real-time updates directly from MongoDB
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
    console.error('❌ Failed to setup property change stream:', error);
  }
};

const initializeChangeStream = () => {
  try {
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
        fullDocument: 'updateLookup', // Get the full document on updates
        fullDocumentBeforeChange: 'whenAvailable' // Get document before delete
      }
    );

    changeStream.on('change', (change: any) => {
      handlePropertyChange(change);
    });

    changeStream.on('error', (error) => {
      console.error('❌ Property change stream error:', error);
      // Attempt to restart the change stream after a delay
      setTimeout(() => {
        console.log('🔄 Attempting to restart property change stream...');
        initializeChangeStream();
      }, 5000);
    });

    console.log('✅ Property MongoDB Change Stream active');
  } catch (error) {
    console.error('❌ Failed to initialize property change stream:', error);
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
        // Transform MongoDB document to match frontend expectations
        const property = transformProperty(fullDocument);
        ioInstance.emit('property:created', {
          property,
          timestamp: new Date().toISOString(),
        });
        console.log(`📤 Emitted property:created for ${propertyId}`);
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
        console.log(`📤 Emitted property:updated for ${propertyId}`);
      }
      break;

    case 'delete':
      ioInstance.emit('property:deleted', {
        propertyId,
        timestamp: new Date().toISOString(),
      });
      console.log(`📤 Emitted property:deleted for ${propertyId}`);
      break;
  }
};

/**
 * Transform MongoDB document to frontend-compatible format
 */
const transformProperty = (doc: any) => {
  return {
    id: doc._id?.toString(),
    ...doc,
    _id: undefined, // Remove _id as we use id
  };
};

// ============================================================================
// MANUAL EMIT FUNCTIONS - Call these from controllers for immediate updates
// ============================================================================

/**
 * Emit property created event
 * Call this from propertyController after successful creation
 */
export const emitPropertyCreated = (property: any) => {
  if (!ioInstance) return;

  ioInstance.emit('property:created', {
    property: transformProperty(property),
    timestamp: new Date().toISOString(),
  });
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
};

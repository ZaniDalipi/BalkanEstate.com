// ============================================================
// PASTE THIS INTO MONGODB COMPASS SHELL (MongoSH) ON PRODUCTION
// Creates all missing indexes to match development
// Safe to run multiple times — skips indexes that already exist
// ============================================================

// --- properties ---
db.properties.createIndex({ sellerId: 1 });
db.properties.createIndex({ createdByName: 1 });
db.properties.createIndex({ createdByEmail: 1 });
db.properties.createIndex({ createdAsRole: 1 });
db.properties.createIndex({ createdByAgencyName: 1 });
db.properties.createIndex({ listingType: 1 });
db.properties.createIndex({ title: 1 });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ soldAt: 1 });
db.properties.createIndex({ price: 1 });
db.properties.createIndex({ city: 1 });
db.properties.createIndex({ country: 1 });
db.properties.createIndex({ sqft: 1 });
db.properties.createIndex({ lastRenewed: 1 });
db.properties.createIndex({ isPromoted: 1 });
db.properties.createIndex({ promotionTier: 1 });
db.properties.createIndex({ hasUrgentBadge: 1 });
db.properties.createIndex({ amenities: 1 });
db.properties.createIndex({ hasVirtualTour360: 1 });
db.properties.createIndex({ hasGeneratedVideo: 1 });
db.properties.createIndex({ lat: 1 });
db.properties.createIndex({ lng: 1 });
db.properties.createIndex({ propertyType: 1 });
db.properties.createIndex({ priceReducedAt: 1 });
db.properties.createIndex({ furnishing: 1 });
db.properties.createIndex({ heatingType: 1 });
db.properties.createIndex({ condition: 1 });
db.properties.createIndex({ viewType: 1 });
db.properties.createIndex({ energyRating: 1 });
db.properties.createIndex({ availableFrom: 1 });
db.properties.createIndex({ rentedAt: 1 });
// Compound indexes
db.properties.createIndex({ lat: 1, lng: 1 });
db.properties.createIndex({ price: 1, status: 1 });
db.properties.createIndex({ propertyType: 1, city: 1, status: 1 });
db.properties.createIndex({ isPromoted: 1, status: 1 });
db.properties.createIndex({ promotionTier: 1, isPromoted: 1, promotionEndDate: 1 });
db.properties.createIndex({ hasUrgentBadge: 1, isPromoted: 1 });
db.properties.createIndex({ priceReducedAt: 1, status: 1 });
db.properties.createIndex({ listingType: 1, status: 1 });
db.properties.createIndex({ listingType: 1, propertyType: 1, city: 1, status: 1 });

// --- users ---
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ isSubscribed: 1 });
db.users.createIndex({ "subscription.tier": 1 });
db.users.createIndex({ unsubscribeToken: 1 });
db.users.createIndex({ provider: 1, providerId: 1 }, { unique: true, partialFilterExpression: { providerId: { $ne: null } } });
db.users.createIndex({ subscriptionExpiresAt: 1, isSubscribed: 1 });
db.users.createIndex({ trialEndDate: 1, trialExpired: 1 });
db.users.createIndex({ lockUntil: 1 });

// --- agents ---
db.agents.createIndex({ userId: 1 }, { unique: true });
db.agents.createIndex({ agencyId: 1 });
db.agents.createIndex({ agentId: 1 }, { unique: true });
db.agents.createIndex({ licenseNumber: 1 }, { unique: true });

// --- agencies ---
db.agencies.createIndex({ ownerId: 1 }, { unique: true });
db.agencies.createIndex({ name: 1 });
db.agencies.createIndex({ slug: 1 }, { unique: true });
db.agencies.createIndex({ invitationCode: 1 }, { unique: true, sparse: true });
db.agencies.createIndex({ city: 1 });
db.agencies.createIndex({ country: 1 });
db.agencies.createIndex({ isFeatured: 1 });
db.agencies.createIndex({ city: 1, isFeatured: 1 });
db.agencies.createIndex({ country: 1, city: 1 });
db.agencies.createIndex({ isFeatured: 1, adRotationOrder: 1 });
db.agencies.createIndex({ agents: 1 });

// --- subscriptions ---
db.subscriptions.createIndex({ userId: 1 });
db.subscriptions.createIndex({ store: 1 });
db.subscriptions.createIndex({ productId: 1 });
db.subscriptions.createIndex({ expirationDate: 1 });
db.subscriptions.createIndex({ status: 1 });
db.subscriptions.createIndex({ userId: 1, status: 1 });
db.subscriptions.createIndex({ store: 1, purchaseToken: 1 }, { unique: true, sparse: true });
db.subscriptions.createIndex({ store: 1, transactionId: 1 }, { unique: true, sparse: true });
db.subscriptions.createIndex({ expirationDate: 1, status: 1 });
db.subscriptions.createIndex({ lastValidated: 1 });

// --- conversations ---
db.conversations.createIndex({ propertyId: 1 });
db.conversations.createIndex({ buyerId: 1 });
db.conversations.createIndex({ sellerId: 1 });
db.conversations.createIndex({ lastMessageAt: 1 });
db.conversations.createIndex({ buyerId: 1, propertyId: 1 });
db.conversations.createIndex({ sellerId: 1, propertyId: 1 });

// --- messages ---
db.messages.createIndex({ conversationId: 1 });
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ isRead: 1 });
db.messages.createIndex({ conversationId: 1, createdAt: 1 });

// --- favorites ---
db.favorites.createIndex({ userId: 1 });
db.favorites.createIndex({ propertyId: 1 });
db.favorites.createIndex({ userId: 1, propertyId: 1 }, { unique: true });

// --- savedsearches ---
db.savedsearches.createIndex({ userId: 1 });

// --- savedagents ---
db.savedagents.createIndex({ userId: 1 });
db.savedagents.createIndex({ agentId: 1 });
db.savedagents.createIndex({ userId: 1, agentId: 1 }, { unique: true });

// --- notifications ---
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ isRead: 1 });
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, type: 1, createdAt: -1 });

// --- pageviews ---
db.pageviews.createIndex({ entityType: 1 });
db.pageviews.createIndex({ entityId: 1 });
db.pageviews.createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
db.pageviews.createIndex({ entityId: 1, createdAt: -1 });
db.pageviews.createIndex({ entityType: 1, createdAt: -1 });
db.pageviews.createIndex({ viewerId: 1, entityId: 1, createdAt: -1 });
db.pageviews.createIndex({ ipHash: 1, entityId: 1, createdAt: -1 });
db.pageviews.createIndex({ createdAt: -1 });

// --- promotions ---
db.promotions.createIndex({ userId: 1 });
db.promotions.createIndex({ propertyId: 1 });
db.promotions.createIndex({ isActive: 1 });
db.promotions.createIndex({ promotionTier: 1 });
db.promotions.createIndex({ userId: 1, isActive: 1 });
db.promotions.createIndex({ propertyId: 1, isActive: 1 });
db.promotions.createIndex({ endDate: 1, isActive: 1 });
db.promotions.createIndex({ promotionTier: 1, isActive: 1, endDate: 1 });
db.promotions.createIndex({ agencyId: 1, isFromAgencyAllocation: 1 });
db.promotions.createIndex({ paymentStatus: 1, createdAt: -1 });
db.promotions.createIndex({ nextRefreshAt: 1 });

// --- promotioncoupons ---
db.promotioncoupons.createIndex({ code: 1 }, { unique: true });
db.promotioncoupons.createIndex({ status: 1 });
db.promotioncoupons.createIndex({ code: 1, status: 1 });
db.promotioncoupons.createIndex({ validFrom: 1, validUntil: 1 });
db.promotioncoupons.createIndex({ status: 1, validUntil: 1 });

// --- discountcodes ---
db.discountcodes.createIndex({ code: 1 }, { unique: true });
db.discountcodes.createIndex({ code: 1, isActive: 1 });
db.discountcodes.createIndex({ validFrom: 1, validUntil: 1 });
db.discountcodes.createIndex({ source: 1 });

// --- paymentrecords ---
db.paymentrecords.createIndex({ userId: 1 });
db.paymentrecords.createIndex({ store: 1 });
db.paymentrecords.createIndex({ status: 1 });
db.paymentrecords.createIndex({ store: 1, storeTransactionId: 1 }, { unique: true });
db.paymentrecords.createIndex({ userId: 1, transactionDate: -1 });
db.paymentrecords.createIndex({ exported: 1, transactionDate: 1 });
db.paymentrecords.createIndex({ transactionType: 1, status: 1, transactionDate: -1 });

// --- saleshistories ---
db.saleshistories.createIndex({ sellerId: 1 });
db.saleshistories.createIndex({ propertyId: 1 });
db.saleshistories.createIndex({ propertyCity: 1 });
db.saleshistories.createIndex({ soldAt: 1 });
db.saleshistories.createIndex({ sellerId: 1, soldAt: -1 });
db.saleshistories.createIndex({ propertyCity: 1, soldAt: -1 });
db.saleshistories.createIndex({ soldAt: -1 });

// --- subscriptionevents ---
db.subscriptionevents.createIndex({ subscriptionId: 1 });
db.subscriptionevents.createIndex({ userId: 1 });
db.subscriptionevents.createIndex({ eventType: 1 });
db.subscriptionevents.createIndex({ subscriptionId: 1, eventDate: -1 });
db.subscriptionevents.createIndex({ userId: 1, eventDate: -1 });
db.subscriptionevents.createIndex({ store: 1, eventType: 1, eventDate: -1 });
db.subscriptionevents.createIndex({ hasFinancialImpact: 1, eventDate: -1 });

// --- bankexports ---
db.bankexports.createIndex({ batchId: 1 }, { unique: true });
db.bankexports.createIndex({ status: 1 });
db.bankexports.createIndex({ status: 1, exportDate: -1 });
db.bankexports.createIndex({ startDate: 1, endDate: 1 });

// --- agencyfeaturedsubscriptions ---
db.agencyfeaturedsubscriptions.createIndex({ agencyId: 1 });
db.agencyfeaturedsubscriptions.createIndex({ userId: 1 });
db.agencyfeaturedsubscriptions.createIndex({ status: 1 });
db.agencyfeaturedsubscriptions.createIndex({ agencyId: 1, status: 1 });
db.agencyfeaturedsubscriptions.createIndex({ userId: 1, status: 1 });
db.agencyfeaturedsubscriptions.createIndex({ currentPeriodEnd: 1, status: 1 });
db.agencyfeaturedsubscriptions.createIndex({ externalSubscriptionId: 1 }, { unique: true, sparse: true });

// --- agencyjoinrequests ---
db.agencyjoinrequests.createIndex({ agentId: 1 });
db.agencyjoinrequests.createIndex({ agencyId: 1 });
db.agencyjoinrequests.createIndex({ status: 1 });
db.agencyjoinrequests.createIndex({ agentId: 1, agencyId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

// --- agentrequests ---
db.agentrequests.createIndex({ status: 1, createdAt: -1 });
db.agentrequests.createIndex({ location: 1 });
db.agentrequests.createIndex({ assignedAgents: 1 });
db.agentrequests.createIndex({ outcome: 1 });
db.agentrequests.createIndex({ completedAt: 1 });

// --- inquiries ---
db.inquiries.createIndex({ recipientId: 1, status: 1 });
db.inquiries.createIndex({ buyerEmail: 1 });
db.inquiries.createIndex({ propertyId: 1 });
db.inquiries.createIndex({ type: 1, status: 1 });
db.inquiries.createIndex({ createdAt: -1 });

// --- propertyalerts ---
db.propertyalerts.createIndex({ userId: 1 });
db.propertyalerts.createIndex({ propertyId: 1 });
db.propertyalerts.createIndex({ userId: 1, propertyId: 1, alertType: 1, createdAt: 1 });
db.propertyalerts.createIndex({ userId: 1, readAt: 1 });
db.propertyalerts.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// --- sitecontents ---
db.sitecontents.createIndex({ key: 1 }, { unique: true });
db.sitecontents.createIndex({ section: 1 });
db.sitecontents.createIndex({ section: 1, subsection: 1, order: 1 });
db.sitecontents.createIndex({ section: 1, category: 1, order: 1 });
db.sitecontents.createIndex({ contentType: 1, isActive: 1 });

// --- pricehistories ---
db.pricehistories.createIndex({ propertyId: 1 });
db.pricehistories.createIndex({ propertyId: 1, changedAt: -1 });

// --- emailconfigs ---
db.emailconfigs.createIndex({ key: 1 }, { unique: true });
db.emailconfigs.createIndex({ category: 1, isActive: 1 });

// --- products ---
db.products.createIndex({ productId: 1 }, { unique: true });
db.products.createIndex({ tier: 1 });
db.products.createIndex({ isActive: 1 });

// --- propertyvaluations ---
db.propertyvaluations.createIndex({ userId: 1 });
db.propertyvaluations.createIndex({ city: 1 });
db.propertyvaluations.createIndex({ country: 1 });
db.propertyvaluations.createIndex({ city: 1, country: 1, propertyType: 1 });
db.propertyvaluations.createIndex({ createdAt: -1 });
db.propertyvaluations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// --- analytics ---
db.analytics.createIndex({ eventType: 1 });
db.analytics.createIndex({ category: 1 });
db.analytics.createIndex({ userId: 1 }, { sparse: true });
db.analytics.createIndex({ sessionId: 1 });
db.analytics.createIndex({ timestamp: 1 });
db.analytics.createIndex({ category: 1, eventType: 1, timestamp: -1 });
db.analytics.createIndex({ userId: 1, timestamp: -1 });
db.analytics.createIndex({ pagePath: 1, timestamp: -1 });
db.analytics.createIndex({ country: 1, timestamp: -1 });
db.analytics.createIndex({ deviceType: 1, timestamp: -1 });
db.analytics.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// --- activitylogs ---
db.activitylogs.createIndex({ category: 1 });
db.activitylogs.createIndex({ action: 1 });
db.activitylogs.createIndex({ severity: 1 });
db.activitylogs.createIndex({ userId: 1 });
db.activitylogs.createIndex({ category: 1, createdAt: -1 });
db.activitylogs.createIndex({ severity: 1, createdAt: -1 });
db.activitylogs.createIndex({ createdAt: -1 });
db.activitylogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// --- promotionplans ---
db.promotionplans.createIndex({ category: 1 });
db.promotionplans.createIndex({ isActive: 1 });
db.promotionplans.createIndex({ category: 1, isActive: 1, displayOrder: 1 });

// --- citymarketdatas ---
db.citymarketdatas.createIndex({ city: 1 });
db.citymarketdatas.createIndex({ country: 1 });
db.citymarketdatas.createIndex({ featured: 1 });
db.citymarketdatas.createIndex({ country: 1, featured: -1, displayOrder: 1 });
db.citymarketdatas.createIndex({ lastUpdated: -1 });

// ============================================================
// ALSO RUN THE PROPERTY MIGRATION (fills missing fields)
// ============================================================
db.properties.updateMany(
  {},
  [{
    $set: {
      listingType: { $ifNull: ["$listingType", "sale"] },
      status: { $ifNull: ["$status", "active"] },
      createdAsRole: { $ifNull: ["$createdAsRole", "private_seller"] },
      hasBalcony: { $ifNull: ["$hasBalcony", false] },
      hasGarden: { $ifNull: ["$hasGarden", false] },
      hasElevator: { $ifNull: ["$hasElevator", false] },
      hasSecurity: { $ifNull: ["$hasSecurity", false] },
      hasAirConditioning: { $ifNull: ["$hasAirConditioning", false] },
      hasPool: { $ifNull: ["$hasPool", false] },
      petsAllowed: { $ifNull: ["$petsAllowed", false] },
      hasVirtualTour360: { $ifNull: ["$hasVirtualTour360", false] },
      hasGeneratedVideo: { $ifNull: ["$hasGeneratedVideo", false] },
      isPromoted: { $ifNull: ["$isPromoted", false] },
      hasUrgentBadge: { $ifNull: ["$hasUrgentBadge", false] },
      specialFeatures: { $ifNull: ["$specialFeatures", []] },
      materials: { $ifNull: ["$materials", []] },
      amenities: { $ifNull: ["$amenities", []] },
      priceIntervals: { $ifNull: ["$priceIntervals", []] },
      views: { $ifNull: ["$views", 0] },
      saves: { $ifNull: ["$saves", 0] },
      inquiries: { $ifNull: ["$inquiries", 0] },
      parking: { $ifNull: ["$parking", 0] }
    }
  }]
);

// Fill rental-specific fields for rent listings
db.properties.updateMany(
  { listingType: "rent" },
  [{
    $set: {
      rentPeriod: { $ifNull: ["$rentPeriod", "monthly"] },
      securityDeposit: { $ifNull: ["$securityDeposit", 0] },
      minimumLeaseDuration: { $ifNull: ["$minimumLeaseDuration", 1] },
      maximumLeaseDuration: { $ifNull: ["$maximumLeaseDuration", 12] },
      utilitiesIncluded: { $ifNull: ["$utilitiesIncluded", false] },
      internetIncluded: { $ifNull: ["$internetIncluded", false] },
      tenantRequirements: { $ifNull: ["$tenantRequirements", []] },
      maxOccupants: { $ifNull: ["$maxOccupants", 1] }
    }
  }]
);

// Verify
print("=== DONE! Verification ===");
print("Total properties: " + db.properties.countDocuments());
print("Sale properties: " + db.properties.countDocuments({ listingType: "sale" }));
print("Rent properties: " + db.properties.countDocuments({ listingType: "rent" }));
print("Total indexes on properties: " + db.properties.getIndexes().length);

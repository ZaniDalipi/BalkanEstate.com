import { apiLogger } from '../utils/logger';
import PropertyRequest from '../models/PropertyRequest';
import Property from '../models/Property';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_LINK = process.env.TELEGRAM_GROUP_LINK || 'https://t.me/BalkanEstate';
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://balkanestate.com';

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Property type emoji mapping
const PROPERTY_TYPE_EMOJI: Record<string, string> = {
  house: '🏠',
  apartment: '🏢',
  villa: '🏡',
  land: '🌍',
  other: '🏗️',
  any: '🔍',
};

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(chatId: string, text: string, options: Record<string, any> = {}): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    apiLogger.warn('[telegramBot] TELEGRAM_BOT_TOKEN not configured, skipping message');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      apiLogger.error('[telegramBot] Failed to send message:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error sending message:', error);
    return false;
  }
}

/**
 * Build an inline keyboard markup for Telegram messages
 */
function inlineKeyboard(rows: Array<Array<{ text: string; url?: string; callback_data?: string }>>) {
  return {
    reply_markup: JSON.stringify({
      inline_keyboard: rows,
    }),
  };
}

/**
 * Format a property request as a Telegram message
 */
function formatPropertyRequest(request: any): string {
  const emoji = PROPERTY_TYPE_EMOJI[request.propertyType] || '🏠';
  const type = request.listingType === 'sale' ? '🔑 Buy' : '📋 Rent';

  let message = `${emoji} <b>New Property Request</b>\n\n`;
  message += `${type} | ${request.propertyType !== 'any' ? request.propertyType : 'Any type'}\n`;

  if (request.location || request.city || request.country) {
    message += `📍 ${[request.location, request.city, request.country].filter(Boolean).join(', ')}\n`;
  }

  if (request.minPrice || request.maxPrice) {
    const priceRange = [];
    if (request.minPrice) priceRange.push(`€${request.minPrice.toLocaleString()}`);
    if (request.maxPrice) priceRange.push(`€${request.maxPrice.toLocaleString()}`);
    message += `💰 ${priceRange.join(' - ')}\n`;
  }

  if (request.minBeds) {
    message += `🛏️ ${request.minBeds}+ beds\n`;
  }

  if (request.minSqft || request.maxSqft) {
    const sqftRange = [];
    if (request.minSqft) sqftRange.push(`${request.minSqft}`);
    if (request.maxSqft) sqftRange.push(`${request.maxSqft}`);
    message += `📐 ${sqftRange.join(' - ')} m²\n`;
  }

  if (request.additionalNotes) {
    message += `\n📝 ${request.additionalNotes}\n`;
  }

  message += `\nBy: ${request.name}`;
  if (request.telegramUsername) {
    message += ` (@${request.telegramUsername.replace('@', '')})`;
  }

  return message;
}

/**
 * Format a property listing as a Telegram message
 */
function formatPropertyListing(property: any): string {
  const emoji = PROPERTY_TYPE_EMOJI[property.propertyType] || '🏠';
  const type = property.listingType === 'sale' ? '🔑 For Sale' : '📋 For Rent';

  let message = `${emoji} <b>${property.title || 'New Property'}</b>\n\n`;
  message += `${type}\n`;
  message += `💰 €${property.price?.toLocaleString() || 'Contact for price'}`;
  if (property.listingType === 'rent' && property.rentPeriod) {
    message += `/${property.rentPeriod}`;
  }
  message += '\n';

  if (property.address || property.city) {
    message += `📍 ${[property.address, property.city, property.country].filter(Boolean).join(', ')}\n`;
  }

  const details = [];
  if (property.beds) details.push(`${property.beds} beds`);
  if (property.baths) details.push(`${property.baths} baths`);
  if (property.sqft) details.push(`${property.sqft} m²`);
  if (details.length > 0) {
    message += `🏠 ${details.join(' | ')}\n`;
  }

  return message;
}

/**
 * Format a property listing with inline buttons
 */
function formatPropertyListingWithButtons(property: any): { text: string; options: Record<string, any> } {
  const propertyId = property._id || property.id;
  const text = formatPropertyListing(property);

  const buttons = inlineKeyboard([
    [
      { text: '🔗 View Property', url: `${FRONTEND_URL}/property/${propertyId}` },
      { text: '📞 Contact Agent', url: `${FRONTEND_URL}/property/${propertyId}#contact` },
    ],
  ]);

  return { text, options: buttons };
}

// ============================================================================
// GROUP JOIN HANDLING
// ============================================================================

/**
 * Handle new members joining the Telegram group
 */
async function handleNewChatMembers(message: any): Promise<void> {
  const chatId = message.chat.id.toString();
  const newMembers = message.new_chat_members || [];

  for (const member of newMembers) {
    // Skip bots joining
    if (member.is_bot) continue;

    const firstName = member.first_name || 'there';
    const username = member.username ? `@${member.username}` : firstName;

    const welcomeMessage =
      `👋 Welcome to <b>BalkanEstate Community</b>, ${firstName}!\n\n` +
      `This group is for finding and sharing property listings across the Balkans.\n\n` +
      `<b>What you can do here:</b>\n` +
      `• Browse property requests from buyers\n` +
      `• Share your listings with the community\n` +
      `• Get notified about new properties\n\n` +
      `<b>Bot Commands (work here and in DMs):</b>\n` +
      `/search [city] - Search properties\n` +
      `/latest - See newest listings\n` +
      `/request [buy|rent] [type] [city] - Submit a request\n` +
      `/stats - Community statistics\n\n` +
      `🌐 Website: ${FRONTEND_URL}`;

    const buttons = inlineKeyboard([
      [
        { text: '🌐 Browse Properties', url: FRONTEND_URL },
        { text: '📝 Submit Request', url: `${FRONTEND_URL}/community` },
      ],
    ]);

    await sendTelegramMessage(chatId, welcomeMessage, buttons);

    apiLogger.info(`[telegramBot] Welcomed new member: ${username} in group ${chatId}`);
  }
}

/**
 * Handle member leaving the group
 */
async function handleLeftChatMember(message: any): Promise<void> {
  // Log for tracking, but don't send a message
  const member = message.left_chat_member;
  if (member && !member.is_bot) {
    apiLogger.info(`[telegramBot] Member left: ${member.username || member.first_name} from group ${message.chat.id}`);
  }
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Handle incoming Telegram bot updates (DMs + group messages)
 */
export async function handleTelegramUpdate(update: any): Promise<void> {
  try {
    const message = update.message;

    // Handle callback queries from inline buttons
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }

    if (!message) return;

    // Handle new members joining (group join detection)
    if (message.new_chat_members && message.new_chat_members.length > 0) {
      await handleNewChatMembers(message);
      return;
    }

    // Handle member leaving
    if (message.left_chat_member) {
      await handleLeftChatMember(message);
      return;
    }

    // Skip if no text (photos, stickers, etc.)
    if (!message.text) return;

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const username = message.from?.username || '';
    const firstName = message.from?.first_name || 'User';
    const isGroupChat = message.chat.type === 'group' || message.chat.type === 'supergroup';

    // In group chats, only respond to commands (starting with /)
    // This prevents the bot from responding to every message in the group
    if (isGroupChat && !text.startsWith('/')) return;

    // Strip bot username from commands in group (e.g., /search@BalkanEstateBot -> /search)
    const commandText = text.replace(/@\w+/, '');

    // Handle commands
    if (commandText.startsWith('/start')) {
      await handleStartCommand(chatId, firstName, isGroupChat);
    } else if (commandText.startsWith('/search')) {
      await handleSearchCommand(chatId, commandText);
    } else if (commandText.startsWith('/request')) {
      await handleRequestCommand(chatId, commandText, firstName, username);
    } else if (commandText.startsWith('/latest')) {
      await handleLatestCommand(chatId);
    } else if (commandText.startsWith('/help')) {
      await handleHelpCommand(chatId);
    } else if (commandText.startsWith('/myrequests')) {
      await handleMyRequestsCommand(chatId);
    } else if (commandText.startsWith('/stats')) {
      await handleStatsCommand(chatId);
    }
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error handling update:', error);
  }
}

/**
 * Handle callback queries from inline keyboard buttons
 */
async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message?.chat?.id?.toString();
  const data = callbackQuery.data;

  if (!chatId || !data) return;

  try {
    // Acknowledge the callback
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQuery.id }),
    });

    if (data === 'cmd_latest') {
      await handleLatestCommand(chatId);
    } else if (data === 'cmd_search') {
      await sendTelegramMessage(chatId,
        '🔍 To search, use:\n/search [city name]\n\nExample: /search Tirana'
      );
    } else if (data === 'cmd_requests') {
      await handleActiveRequestsCommand(chatId);
    }
  } catch (error: any) {
    apiLogger.error('[telegramBot] Callback query error:', error);
  }
}

async function handleStartCommand(chatId: string, firstName: string, isGroupChat: boolean): Promise<void> {
  const message = `👋 Welcome to <b>BalkanEstate</b>, ${firstName}!\n\n` +
    `I can help you find properties across the Balkans or submit a property request for agents to see.\n\n` +
    `<b>Available Commands:</b>\n` +
    `/search [city] - Search properties in a city\n` +
    `/request - Submit a property request\n` +
    `/latest - View latest listings\n` +
    `/stats - Community statistics\n` +
    (isGroupChat ? '' : `/myrequests - View your active requests\n`) +
    `/help - Show all commands\n\n` +
    `🌐 Visit our website: ${FRONTEND_URL}` +
    (isGroupChat ? '' : `\n👥 Join our community: ${TELEGRAM_GROUP_LINK}`);

  const buttons = inlineKeyboard([
    [
      { text: '🏠 Latest Properties', callback_data: 'cmd_latest' },
      { text: '🔍 Search', callback_data: 'cmd_search' },
    ],
    [
      { text: '📋 Active Requests', callback_data: 'cmd_requests' },
      { text: '🌐 Website', url: FRONTEND_URL },
    ],
  ]);

  await sendTelegramMessage(chatId, message, buttons);
}

async function handleHelpCommand(chatId: string): Promise<void> {
  const message = `📖 <b>BalkanEstate Bot Commands</b>\n\n` +
    `/search [city] - Search properties in a city\n` +
    `  Example: /search Tirana\n\n` +
    `/request [type] [city] [budget] - Quick property request\n` +
    `  Example: /request buy apartment Tirana 50000-100000\n\n` +
    `/latest - View 5 latest listings\n\n` +
    `/stats - Community statistics\n\n` +
    `/myrequests - View your active property requests\n\n` +
    `💡 <b>Tip:</b> You can also submit detailed requests on our website at ${FRONTEND_URL}/community`;

  await sendTelegramMessage(chatId, message);
}

async function handleSearchCommand(chatId: string, text: string): Promise<void> {
  const query = text.replace('/search', '').trim();

  if (!query) {
    await sendTelegramMessage(chatId,
      '🔍 <b>Search Properties</b>\n\nUsage: /search [city]\nExample: /search Tirana\n\nOr browse all listings at ' + FRONTEND_URL
    );
    return;
  }

  try {
    const properties = await Property.find({
      status: 'active',
      $or: [
        { city: { $regex: query, $options: 'i' } },
        { country: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (properties.length === 0) {
      await sendTelegramMessage(chatId,
        `🔍 No properties found in "${query}".\n\nTry a different city or submit a property request with /request`
      );
      return;
    }

    // Send each property as a separate message with buttons
    await sendTelegramMessage(chatId, `🔍 <b>Properties in "${query}"</b> (${properties.length} found)\n`);

    for (const property of properties) {
      const { text: propText, options } = formatPropertyListingWithButtons(property);
      await sendTelegramMessage(chatId, propText, options);
    }

    const moreButton = inlineKeyboard([
      [{ text: '🔗 See All Results', url: `${FRONTEND_URL}/search?query=${encodeURIComponent(query)}` }],
    ]);
    await sendTelegramMessage(chatId, `📊 See more results on our website`, moreButton);
  } catch (error: any) {
    apiLogger.error('[telegramBot] Search error:', error);
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error searching properties. Please try again.');
  }
}

async function handleRequestCommand(chatId: string, text: string, firstName: string, username: string): Promise<void> {
  const args = text.replace('/request', '').trim().split(/\s+/);

  if (args.length < 2 || !args[0]) {
    await sendTelegramMessage(chatId,
      '📝 <b>Submit a Property Request</b>\n\n' +
      'Usage: /request [buy|rent] [property type] [city] [min-max budget]\n\n' +
      'Examples:\n' +
      '/request buy apartment Tirana 50000-100000\n' +
      '/request rent house Skopje 300-600\n' +
      '/request buy villa Durres\n\n' +
      `Or submit a detailed request at ${FRONTEND_URL}/community`
    );
    return;
  }

  try {
    // Parse arguments
    const listingType = args[0].toLowerCase() === 'rent' ? 'rent' : 'sale';
    const propertyType = ['house', 'apartment', 'villa', 'land'].includes(args[1]?.toLowerCase())
      ? args[1].toLowerCase()
      : 'any';
    const city = propertyType !== 'any' ? args[2] : args[1];
    const budgetStr = propertyType !== 'any' ? args[3] : args[2];

    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    if (budgetStr) {
      const budgetParts = budgetStr.split('-');
      minPrice = parseInt(budgetParts[0]) || undefined;
      maxPrice = parseInt(budgetParts[1]) || undefined;
    }

    const request = await PropertyRequest.create({
      name: firstName,
      telegramUsername: username,
      telegramChatId: chatId,
      source: 'telegram',
      listingType,
      propertyType,
      city: city || undefined,
      minPrice,
      maxPrice,
    });

    const confirmMsg = `✅ <b>Property request submitted!</b>\n\n` +
      `Type: ${listingType === 'sale' ? 'Buy' : 'Rent'}\n` +
      `Property: ${propertyType}\n` +
      (city ? `City: ${city}\n` : '') +
      (minPrice || maxPrice ? `Budget: €${minPrice?.toLocaleString() || '?'} - €${maxPrice?.toLocaleString() || '?'}\n` : '') +
      `\nAgents and sellers will be able to see your request and suggest matching properties.`;

    const buttons = inlineKeyboard([
      [{ text: '📋 View All Requests', url: `${FRONTEND_URL}/community` }],
    ]);

    await sendTelegramMessage(chatId, confirmMsg, buttons);

    // Notify the group about the new request
    notifyGroupAboutRequest(request).catch((err) => {
      apiLogger.error('[telegramBot] Failed to notify group about telegram request:', err);
    });
  } catch (error: any) {
    apiLogger.error('[telegramBot] Request creation error:', error);
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error creating your request. Please try again.');
  }
}

async function handleLatestCommand(chatId: string): Promise<void> {
  try {
    const properties = await Property.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (properties.length === 0) {
      await sendTelegramMessage(chatId, '📭 No listings available right now. Check back soon!');
      return;
    }

    await sendTelegramMessage(chatId, '🏠 <b>Latest Properties</b>\n');

    for (const property of properties) {
      const { text, options } = formatPropertyListingWithButtons(property);
      await sendTelegramMessage(chatId, text, options);
    }

    const buttons = inlineKeyboard([
      [{ text: '🔗 Browse All', url: FRONTEND_URL }],
    ]);
    await sendTelegramMessage(chatId, `🔗 Browse all properties on our website`, buttons);
  } catch (error: any) {
    apiLogger.error('[telegramBot] Latest listings error:', error);
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error fetching listings. Please try again.');
  }
}

async function handleMyRequestsCommand(chatId: string): Promise<void> {
  try {
    const requests = await PropertyRequest.find({
      telegramChatId: chatId,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (requests.length === 0) {
      await sendTelegramMessage(chatId,
        '📭 You have no active property requests.\n\nUse /request to submit one!'
      );
      return;
    }

    let response = `📋 <b>Your Active Requests</b> (${requests.length})\n\n`;
    for (const req of requests) {
      response += formatPropertyRequest(req) + '\n\n---\n\n';
    }

    await sendTelegramMessage(chatId, response);
  } catch (error: any) {
    apiLogger.error('[telegramBot] My requests error:', error);
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error fetching your requests. Please try again.');
  }
}

/**
 * Show community statistics
 */
async function handleStatsCommand(chatId: string): Promise<void> {
  try {
    const [totalActive, totalProperties, recentRequests, recentProperties] = await Promise.all([
      PropertyRequest.countDocuments({ status: 'active' }),
      Property.countDocuments({ status: 'active' }),
      PropertyRequest.countDocuments({
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Property.countDocuments({
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const message =
      `📊 <b>BalkanEstate Community Stats</b>\n\n` +
      `🏠 Active listings: <b>${totalProperties}</b>\n` +
      `📋 Active requests: <b>${totalActive}</b>\n\n` +
      `<b>This week:</b>\n` +
      `🆕 New listings: ${recentProperties}\n` +
      `📝 New requests: ${recentRequests}\n\n` +
      `🌐 ${FRONTEND_URL}`;

    const buttons = inlineKeyboard([
      [
        { text: '🏠 Browse Properties', url: FRONTEND_URL },
        { text: '📋 View Requests', url: `${FRONTEND_URL}/community` },
      ],
    ]);

    await sendTelegramMessage(chatId, message, buttons);
  } catch (error: any) {
    apiLogger.error('[telegramBot] Stats error:', error);
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error fetching stats. Please try again.');
  }
}

/**
 * Show active property requests (for callback button)
 */
async function handleActiveRequestsCommand(chatId: string): Promise<void> {
  try {
    const requests = await PropertyRequest.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (requests.length === 0) {
      await sendTelegramMessage(chatId,
        '📭 No active property requests right now.\n\nBe the first! Use /request to submit one.'
      );
      return;
    }

    let response = `📋 <b>Recent Property Requests</b>\n\n`;
    for (const req of requests) {
      response += formatPropertyRequest(req) + '\n\n---\n\n';
    }

    const buttons = inlineKeyboard([
      [{ text: '📋 View All on Website', url: `${FRONTEND_URL}/community` }],
    ]);

    await sendTelegramMessage(chatId, response, buttons);
  } catch (error: any) {
    apiLogger.error('[telegramBot] Active requests error:', error);
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error fetching requests. Please try again.');
  }
}

// ============================================================================
// GROUP NOTIFICATIONS
// ============================================================================

/**
 * Notify Telegram group about a new property request (for agents to see)
 */
export async function notifyGroupAboutRequest(request: any): Promise<void> {
  if (!TELEGRAM_GROUP_CHAT_ID || !TELEGRAM_BOT_TOKEN) return;

  const message = formatPropertyRequest(request);
  const buttons = inlineKeyboard([
    [{ text: '📋 View All Requests', url: `${FRONTEND_URL}/community` }],
  ]);

  await sendTelegramMessage(TELEGRAM_GROUP_CHAT_ID, message, buttons);
}

/**
 * Notify Telegram group about a new property listing
 */
export async function notifyGroupAboutNewListing(property: any): Promise<void> {
  if (!TELEGRAM_GROUP_CHAT_ID || !TELEGRAM_BOT_TOKEN) return;

  const { text, options } = formatPropertyListingWithButtons(property);
  const header = `🆕 <b>New Listing Added!</b>\n\n`;

  await sendTelegramMessage(TELEGRAM_GROUP_CHAT_ID, header + text, options);
}

/**
 * Notify a specific user about a property match
 */
export async function notifyUserAboutMatch(chatId: string, property: any): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  const { text, options } = formatPropertyListingWithButtons(property);
  const header = `🎯 <b>Property Match Found!</b>\n\nWe found a property that matches your request:\n\n`;

  await sendTelegramMessage(chatId, header + text, options);
}

/**
 * Check if a new property matches any active requests and notify users
 */
export async function checkAndNotifyMatches(property: any): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  try {
    // Build filter for matching requests
    const filter: any = {
      status: 'active',
      telegramChatId: { $exists: true, $ne: '' },
    };

    // Match listing type
    if (property.listingType) {
      filter.listingType = property.listingType;
    }

    // Match property type (also match 'any')
    if (property.propertyType) {
      filter.propertyType = { $in: [property.propertyType, 'any'] };
    }

    const matchingRequests = await PropertyRequest.find(filter).lean();

    let notifiedCount = 0;
    for (const request of matchingRequests) {
      // Check price range match
      if (request.minPrice && property.price && property.price < request.minPrice) continue;
      if (request.maxPrice && property.price && property.price > request.maxPrice) continue;

      // Check city match (case-insensitive)
      if (request.city && property.city) {
        if (request.city.toLowerCase() !== property.city.toLowerCase()) continue;
      }

      // Check bedroom match
      if (request.minBeds && property.beds && property.beds < request.minBeds) continue;

      // Notify the user
      if (request.telegramChatId) {
        await notifyUserAboutMatch(request.telegramChatId, property);
        notifiedCount++;

        // Update response count
        await PropertyRequest.updateOne(
          { _id: request._id },
          { $inc: { responseCount: 1 } }
        );
      }
    }

    if (notifiedCount > 0) {
      apiLogger.info(`[telegramBot] Notified ${notifiedCount} users about matching property ${property._id}`);
    }
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error checking matches:', error);
  }
}

// ============================================================================
// DIGEST / PERIODIC UPDATES
// ============================================================================

/**
 * Send a digest of new listings to the Telegram group
 * Called by the cron job
 */
export async function sendGroupDigest(): Promise<void> {
  if (!TELEGRAM_GROUP_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
    apiLogger.warn('[telegramBot] Cannot send digest: missing TELEGRAM_GROUP_CHAT_ID or TELEGRAM_BOT_TOKEN');
    return;
  }

  try {
    // Get properties listed in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newProperties = await Property.find({
      status: 'active',
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const newRequests = await PropertyRequest.find({
      status: 'active',
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Only send if there's something to report
    if (newProperties.length === 0 && newRequests.length === 0) {
      apiLogger.info('[telegramBot] No new listings or requests in last 24h, skipping digest');
      return;
    }

    let digest = `📬 <b>Daily BalkanEstate Digest</b>\n\n`;

    if (newProperties.length > 0) {
      digest += `🏠 <b>${newProperties.length} New Listing${newProperties.length > 1 ? 's' : ''}</b>\n\n`;
    }

    if (newRequests.length > 0) {
      digest += `📋 <b>${newRequests.length} New Request${newRequests.length > 1 ? 's' : ''}</b>\n\n`;
    }

    const buttons = inlineKeyboard([
      [
        { text: `🏠 View Listings (${newProperties.length})`, url: FRONTEND_URL },
        { text: `📋 View Requests (${newRequests.length})`, url: `${FRONTEND_URL}/community` },
      ],
    ]);

    await sendTelegramMessage(TELEGRAM_GROUP_CHAT_ID, digest, buttons);

    // Send top 3 new properties with buttons
    const topProperties = newProperties.slice(0, 3);
    for (const property of topProperties) {
      const { text, options } = formatPropertyListingWithButtons(property);
      await sendTelegramMessage(TELEGRAM_GROUP_CHAT_ID, text, options);
    }

    if (newProperties.length > 3) {
      const moreButton = inlineKeyboard([
        [{ text: `🔗 View All ${newProperties.length} New Listings`, url: FRONTEND_URL }],
      ]);
      await sendTelegramMessage(
        TELEGRAM_GROUP_CHAT_ID,
        `... and ${newProperties.length - 3} more new listing${newProperties.length - 3 > 1 ? 's' : ''}!`,
        moreButton
      );
    }

    apiLogger.info(`[telegramBot] Sent daily digest: ${newProperties.length} properties, ${newRequests.length} requests`);
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error sending digest:', error);
  }
}

// ============================================================================
// WEBHOOK SETUP
// ============================================================================

/**
 * Set up the Telegram webhook URL
 */
export async function setupTelegramWebhook(webhookUrl: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    apiLogger.warn('[telegramBot] TELEGRAM_BOT_TOKEN not configured, skipping webhook setup');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const result = await response.json() as { ok: boolean };
    if (result.ok) {
      apiLogger.info(`[telegramBot] Webhook set to: ${webhookUrl}`);
      return true;
    } else {
      apiLogger.error('[telegramBot] Failed to set webhook:', result);
      return false;
    }
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error setting webhook:', error);
    return false;
  }
}

/**
 * Register bot commands with Telegram (shown in the command menu)
 */
export async function registerBotCommands(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  const commands = [
    { command: 'start', description: 'Start the bot and see welcome message' },
    { command: 'search', description: 'Search properties by city' },
    { command: 'request', description: 'Submit a property request' },
    { command: 'latest', description: 'View latest property listings' },
    { command: 'stats', description: 'Community statistics' },
    { command: 'myrequests', description: 'View your active requests' },
    { command: 'help', description: 'Show all available commands' },
  ];

  try {
    const response = await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });

    const result = await response.json() as { ok: boolean };
    if (result.ok) {
      apiLogger.info('[telegramBot] Bot commands registered successfully');
    } else {
      apiLogger.error('[telegramBot] Failed to register commands:', result);
    }
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error registering commands:', error);
  }
}

/**
 * Initialize the Telegram bot: set webhook, register commands
 */
export async function initializeTelegramBot(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    apiLogger.info('[telegramBot] TELEGRAM_BOT_TOKEN not set, skipping bot initialization');
    return;
  }

  const backendUrl = process.env.BACKEND_URL || process.env.API_URL;
  if (backendUrl) {
    const webhookUrl = `${backendUrl}/api/telegram/webhook`;
    await setupTelegramWebhook(webhookUrl);
  } else {
    apiLogger.warn('[telegramBot] BACKEND_URL not set, webhook not registered. Set BACKEND_URL to enable webhook.');
  }

  await registerBotCommands();

  apiLogger.info('[telegramBot] Bot initialization complete');
}

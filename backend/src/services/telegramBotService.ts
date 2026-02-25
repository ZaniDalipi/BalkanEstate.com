import { apiLogger } from '../utils/logger';
import PropertyRequest from '../models/PropertyRequest';
import Property from '../models/Property';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_LINK = process.env.TELEGRAM_GROUP_LINK || 'https://t.me/BalkanEstate';
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

  message += `\n\n🔗 <a href="${FRONTEND_URL}/community">View all requests</a>`;

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

  const propertyId = property._id || property.id;
  message += `\n🔗 <a href="${FRONTEND_URL}/property/${propertyId}">View property</a>`;

  return message;
}

/**
 * Handle incoming Telegram bot commands
 */
export async function handleTelegramUpdate(update: any): Promise<void> {
  try {
    const message = update.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const username = message.from?.username || '';
    const firstName = message.from?.first_name || 'User';

    // Handle commands
    if (text.startsWith('/start')) {
      await handleStartCommand(chatId, firstName);
    } else if (text.startsWith('/search')) {
      await handleSearchCommand(chatId, text);
    } else if (text.startsWith('/request')) {
      await handleRequestCommand(chatId, text, firstName, username);
    } else if (text.startsWith('/latest')) {
      await handleLatestCommand(chatId);
    } else if (text.startsWith('/help')) {
      await handleHelpCommand(chatId);
    } else if (text.startsWith('/myrequests')) {
      await handleMyRequestsCommand(chatId);
    }
  } catch (error: any) {
    apiLogger.error('[telegramBot] Error handling update:', error);
  }
}

async function handleStartCommand(chatId: string, firstName: string): Promise<void> {
  const message = `👋 Welcome to <b>BalkanEstate</b>, ${firstName}!\n\n` +
    `I can help you find properties across the Balkans or submit a property request for agents to see.\n\n` +
    `<b>Available Commands:</b>\n` +
    `/search [city] - Search properties in a city\n` +
    `/request - Submit a property request\n` +
    `/latest - View latest listings\n` +
    `/myrequests - View your active requests\n` +
    `/help - Show all commands\n\n` +
    `🌐 Visit our website: ${FRONTEND_URL}\n` +
    `👥 Join our community: ${TELEGRAM_GROUP_LINK}`;

  await sendTelegramMessage(chatId, message);
}

async function handleHelpCommand(chatId: string): Promise<void> {
  const message = `📖 <b>BalkanEstate Bot Commands</b>\n\n` +
    `/search [city] - Search properties in a city\n` +
    `  Example: /search Tirana\n\n` +
    `/request [type] [city] [budget] - Quick property request\n` +
    `  Example: /request buy apartment Tirana 50000-100000\n\n` +
    `/latest - View 5 latest listings\n\n` +
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

    let response = `🔍 <b>Properties in "${query}"</b>\n\n`;
    for (const property of properties) {
      response += formatPropertyListing(property) + '\n\n---\n\n';
    }
    response += `📊 See more results at ${FRONTEND_URL}/search?query=${encodeURIComponent(query)}`;

    await sendTelegramMessage(chatId, response);
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
      `\nAgents and sellers will be able to see your request and suggest matching properties.\n` +
      `Request ID: ${request._id}`;

    await sendTelegramMessage(chatId, confirmMsg);
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

    let response = '🏠 <b>Latest Properties</b>\n\n';
    for (const property of properties) {
      response += formatPropertyListing(property) + '\n\n---\n\n';
    }
    response += `🔗 Browse all at ${FRONTEND_URL}`;

    await sendTelegramMessage(chatId, response);
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

    let response = '📋 <b>Your Active Requests</b>\n\n';
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
 * Notify Telegram group about a new property request (for agents to see)
 */
export async function notifyGroupAboutRequest(request: any): Promise<void> {
  const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
  if (!groupChatId || !TELEGRAM_BOT_TOKEN) return;

  const message = formatPropertyRequest(request);
  await sendTelegramMessage(groupChatId, message);
}

/**
 * Notify a specific user about a property match
 */
export async function notifyUserAboutMatch(chatId: string, property: any): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;

  const message = `🎯 <b>Property Match Found!</b>\n\n` +
    `We found a property that matches your request:\n\n` +
    formatPropertyListing(property);

  await sendTelegramMessage(chatId, message);
}

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
        allowed_updates: ['message'],
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

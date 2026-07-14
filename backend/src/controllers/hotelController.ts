import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import Hotel, {
  HOTEL_PROPERTY_TYPES,
  HOTEL_AMENITIES,
  ROOM_TYPES,
  BED_TYPES,
  SUPPORTED_CURRENCIES,
  CANCELLATION_POLICIES,
  type IRoom,
  type IBedOption,
} from '../models/Hotel';
import { IUser } from '../models/User';
import HotelListingCode from '../models/HotelListingCode';
import { redeemCodeForHotel } from './hotelCodeController';
import { uploadImage, deleteImage } from '../services/cloudinaryService';
import { getParam, getObjectIdParam } from '../utils/validateParams';
import { encodeId, resolveId } from '../utils/idObfuscation';

const MAX_HOTELS_PER_USER = 10;

/** Transform lean document: map _id → obfuscated id, strip internals */
const transformLean = (doc: any) => {
  if (!doc) return doc;
  const { _id, __v, coverImagePublicId, images, accessCode, ...rest } = doc;
  const hex = _id?.toString();
  const cleanImages = Array.isArray(images)
    ? images.map((img: any) => {
        const { publicId, ...imgRest } = img || {};
        return imgRest;
      })
    : [];
  return { id: hex ? encodeId(hex) : hex, images: cleanImages, ...rest };
};

/**
 * Sanitize a free-text "custom amenity" list: trim, drop empties/duplicates,
 * cap length per entry and total count.
 */
const sanitizeCustomAmenities = (raw: any, maxCount: number, maxLen = 40): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim().slice(0, maxLen);
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= maxCount) break;
  }
  return result;
};

/**
 * Sanitize a single room from client input. Returns null when the room is
 * structurally invalid so callers can reject the whole request.
 */
const sanitizeRoom = (raw: any): IRoom | { error: string } => {
  if (!raw || typeof raw !== 'object') return { error: 'Each room must be an object' };
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return { error: 'Each room requires a name' };
  if (!ROOM_TYPES.includes(raw.roomType)) {
    return { error: `Invalid room type. Must be one of: ${ROOM_TYPES.join(', ')}` };
  }
  const pricePerNight = Number(raw.pricePerNight);
  if (!Number.isFinite(pricePerNight) || pricePerNight < 1) {
    return { error: `Room "${name}" needs a valid price per night` };
  }
  const maxGuests = Number(raw.maxGuests);
  if (!Number.isFinite(maxGuests) || maxGuests < 1) {
    return { error: `Room "${name}" needs a valid maximum guest count` };
  }

  // Structured bed breakdown (e.g. "1 king bed" or "2 twin beds"). When
  // provided, it's the source of truth and the total bed count is derived
  // from it; otherwise fall back to a plain bed count for compatibility.
  let bedConfiguration: IBedOption[] | undefined;
  if (Array.isArray(raw.bedConfiguration) && raw.bedConfiguration.length > 0) {
    bedConfiguration = [];
    for (const entry of raw.bedConfiguration.slice(0, 6)) {
      if (!BED_TYPES.includes(entry?.bedType)) {
        return { error: `Room "${name}" has an invalid bed type` };
      }
      const quantity = Number(entry?.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return { error: `Room "${name}" needs a valid bed quantity` };
      }
      bedConfiguration.push({ bedType: entry.bedType, quantity: Math.min(10, quantity) });
    }
  }

  const beds = bedConfiguration
    ? bedConfiguration.reduce((sum, b) => sum + b.quantity, 0)
    : Number(raw.beds);
  if (!Number.isFinite(beds) || beds < 1) {
    return { error: `Room "${name}" needs at least 1 bed` };
  }

  const room: IRoom = {
    name,
    roomType: raw.roomType,
    description: typeof raw.description === 'string' ? raw.description.trim() : undefined,
    maxGuests,
    beds,
    bedConfiguration,
    bathrooms: Number.isFinite(Number(raw.bathrooms)) ? Number(raw.bathrooms) : 1,
    sizeSqm: raw.sizeSqm != null && Number.isFinite(Number(raw.sizeSqm)) ? Number(raw.sizeSqm) : undefined,
    pricePerNight,
    currency: SUPPORTED_CURRENCIES.includes(raw.currency) ? raw.currency : 'EUR',
    quantity: Number.isFinite(Number(raw.quantity)) && Number(raw.quantity) >= 1 ? Number(raw.quantity) : 1,
    amenities: Array.isArray(raw.amenities)
      ? raw.amenities.filter((a: any) => HOTEL_AMENITIES.includes(a)).slice(0, 30)
      : [],
    customAmenities: sanitizeCustomAmenities(raw.customAmenities, 10),
  };
  return room;
};

// @desc    Get all hotels/rooms (public, with filtering & pagination)
// @route   GET /api/hotels
// @access  Public
export const getHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isActive: true };

    const propertyType = req.query.propertyType as string;
    if (propertyType && HOTEL_PROPERTY_TYPES.includes(propertyType as any)) {
      filter.propertyType = propertyType;
    }

    const city = req.query.city as string;
    if (city) {
      filter.city = { $regex: new RegExp(`^${escapeRegex(city)}$`, 'i') };
    }

    const country = req.query.country as string;
    if (country) {
      filter.country = { $regex: new RegExp(`^${escapeRegex(country)}$`, 'i') };
    }

    // Amenity filter (comma-separated) — property must include ALL requested amenities
    const amenitiesParam = req.query.amenities as string;
    if (amenitiesParam) {
      const requested = amenitiesParam
        .split(',')
        .map((a) => a.trim())
        .filter((a) => HOTEL_AMENITIES.includes(a as any));
      if (requested.length > 0) filter.amenities = { $all: requested };
    }

    // Price range (filters on cheapest room)
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      filter.priceFrom = {};
      if (Number.isFinite(minPrice)) filter.priceFrom.$gte = minPrice;
      if (Number.isFinite(maxPrice)) filter.priceFrom.$lte = maxPrice;
    }

    // Guests: at least one room sleeps this many
    const guests = Number(req.query.guests);
    if (Number.isFinite(guests) && guests > 0) {
      filter['rooms.maxGuests'] = { $gte: guests };
    }

    const search = req.query.search as string;
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { city: searchRegex },
      ];
    }

    // Sorting
    let sort: Record<string, 1 | -1> = { isVerified: -1, views: -1, createdAt: -1 };
    switch (req.query.sort) {
      case 'price_asc':
        sort = { priceFrom: 1 };
        break;
      case 'price_desc':
        sort = { priceFrom: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'rating':
        sort = { starRating: -1, isVerified: -1 };
        break;
    }

    const [hotels, total] = await Promise.all([
      Hotel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name avatarUrl')
        .lean(),
      Hotel.countDocuments(filter),
    ]);

    res.status(200).json({
      hotels: hotels.map(transformLean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch hotels', error: error.message });
  }
};

// @desc    Get single hotel (public)
// @route   GET /api/hotels/:id
// @access  Public
export const getHotel = async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrSlug = getParam(req, 'id');
    if (!idOrSlug) {
      res.status(400).json({ message: 'Invalid ID or slug' });
      return;
    }

    let hotel;
    const resolvedId = resolveId(idOrSlug);
    if (resolvedId) {
      hotel = await Hotel.findById(resolvedId).populate('owner', 'name avatarUrl email').lean();
    }
    if (!hotel) {
      hotel = await Hotel.findOne({ slug: idOrSlug.toLowerCase() })
        .populate('owner', 'name avatarUrl email')
        .lean();
    }

    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }

    Hotel.updateOne({ _id: hotel._id }, { $inc: { views: 1 } }).catch(() => {});

    res.status(200).json({ hotel: transformLean(hotel) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch hotel', error: error.message });
  }
};

// @desc    Get current user's hotels
// @route   GET /api/hotels/my-listings
// @access  Private
export const getMyHotels = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const currentUser = req.user as IUser;
    const hotels = await Hotel.find({ owner: currentUser._id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ hotels: hotels.map(transformLean) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch your hotels', error: error.message });
  }
};

// @desc    Create a hotel/room listing
// @route   POST /api/hotels
// @access  Private
export const createHotel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const currentUser = req.user as IUser;

    const existingCount = await Hotel.countDocuments({ owner: currentUser._id });
    if (existingCount >= MAX_HOTELS_PER_USER) {
      res.status(400).json({ message: `Maximum of ${MAX_HOTELS_PER_USER} hotel listings allowed per user` });
      return;
    }

    const { name, propertyType, contactPhone, city, country, rooms } = req.body;
    if (!name || !propertyType || !contactPhone || !city || !country) {
      res.status(400).json({ message: 'Name, property type, contact phone, city, and country are required' });
      return;
    }
    if (!HOTEL_PROPERTY_TYPES.includes(propertyType)) {
      res.status(400).json({ message: `Invalid property type. Must be one of: ${HOTEL_PROPERTY_TYPES.join(', ')}` });
      return;
    }
    if (!Array.isArray(rooms) || rooms.length === 0) {
      res.status(400).json({ message: 'At least one room type is required' });
      return;
    }
    if (rooms.length > 50) {
      res.status(400).json({ message: 'A property cannot have more than 50 room types' });
      return;
    }

    // Validate & sanitize rooms
    const sanitizedRooms: IRoom[] = [];
    for (const raw of rooms) {
      const result = sanitizeRoom(raw);
      if ('error' in result) {
        res.status(400).json({ message: result.error });
        return;
      }
      sanitizedRooms.push(result);
    }

    const starRating = req.body.starRating != null ? Number(req.body.starRating) : undefined;
    if (starRating != null && (!Number.isFinite(starRating) || starRating < 1 || starRating > 5)) {
      res.status(400).json({ message: 'Star rating must be between 1 and 5' });
      return;
    }

    const hotelData = {
      owner: currentUser._id,
      name: String(name).trim(),
      description: typeof req.body.description === 'string' ? req.body.description.trim() : undefined,
      propertyType,
      starRating,
      contactPhone: String(contactPhone).trim(),
      contactEmail: req.body.contactEmail,
      website: req.body.website,
      whatsapp: req.body.whatsapp,
      address: req.body.address,
      city: String(city).trim(),
      country: String(country).trim(),
      latitude: req.body.latitude != null ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude != null ? Number(req.body.longitude) : undefined,
      amenities: Array.isArray(req.body.amenities)
        ? req.body.amenities.filter((a: any) => HOTEL_AMENITIES.includes(a)).slice(0, 40)
        : [],
      customAmenities: sanitizeCustomAmenities(req.body.customAmenities, 15),
      rooms: sanitizedRooms,
      currency: SUPPORTED_CURRENCIES.includes(req.body.currency) ? req.body.currency : 'EUR',
      checkInTime: req.body.checkInTime,
      checkOutTime: req.body.checkOutTime,
      minNights: req.body.minNights != null ? Number(req.body.minNights) : undefined,
      maxNights: req.body.maxNights != null ? Number(req.body.maxNights) : undefined,
      cancellationPolicy: CANCELLATION_POLICIES.includes(req.body.cancellationPolicy)
        ? req.body.cancellationPolicy
        : undefined,
      houseRules: Array.isArray(req.body.houseRules)
        ? req.body.houseRules.filter((r: any) => typeof r === 'string').slice(0, 20)
        : [],
      petsAllowed: Boolean(req.body.petsAllowed),
      smokingAllowed: Boolean(req.body.smokingAllowed),
      languagesSpoken: Array.isArray(req.body.languagesSpoken)
        ? req.body.languagesSpoken.filter((l: any) => typeof l === 'string').slice(0, 10)
        : [],
    };

    // Optional access code (interim monetization bridge). Validate up-front so
    // an invalid code fails before we create anything.
    const rawCode = typeof req.body.listingCode === 'string' ? req.body.listingCode.trim().toUpperCase() : '';
    if (rawCode) {
      const preview = await HotelListingCode.findOne({ code: rawCode });
      if (!preview || !(preview as any).isRedeemable?.()) {
        res.status(400).json({ message: 'Invalid, used or expired access code' });
        return;
      }
    }

    const hotel = await Hotel.create(hotelData);

    // Atomically redeem the code now that we have a hotel id. If it lost a race,
    // the listing is still created (just not comped) — never fail after create.
    if (rawCode) {
      try {
        const code = await redeemCodeForHotel(rawCode, currentUser._id as any, hotel._id as any);
        hotel.accessCode = code;
        hotel.isComped = true;
        await hotel.save();
      } catch {
        // Code was taken between validation and redemption — leave as non-comped.
      }
    }

    const leanHotel = hotel.toObject();

    res.status(201).json({ hotel: transformLean(leanHotel), message: 'Hotel listing created successfully' });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join('. ') });
      return;
    }
    res.status(500).json({ message: 'Failed to create hotel listing', error: error.message });
  }
};

// @desc    Update a hotel
// @route   PUT /api/hotels/:id
// @access  Private (owner only)
export const updateHotel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const currentUser = req.user as IUser;
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }
    if (String(hotel.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to update this listing' });
      return;
    }

    const allowedFields = [
      'name', 'description', 'propertyType', 'starRating', 'contactPhone', 'contactEmail',
      'website', 'whatsapp', 'address', 'city', 'country', 'latitude', 'longitude',
      'amenities', 'customAmenities', 'currency', 'checkInTime', 'checkOutTime', 'minNights', 'maxNights',
      'cancellationPolicy', 'houseRules', 'petsAllowed', 'smokingAllowed', 'languagesSpoken',
      'isActive',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.propertyType && !HOTEL_PROPERTY_TYPES.includes(updates.propertyType)) {
      res.status(400).json({ message: `Invalid property type. Must be one of: ${HOTEL_PROPERTY_TYPES.join(', ')}` });
      return;
    }

    if (updates.starRating != null) {
      const sr = Number(updates.starRating);
      if (!Number.isFinite(sr) || sr < 1 || sr > 5) {
        res.status(400).json({ message: 'Star rating must be between 1 and 5' });
        return;
      }
      updates.starRating = sr;
    }

    if (updates.amenities && Array.isArray(updates.amenities)) {
      updates.amenities = updates.amenities.filter((a: any) => HOTEL_AMENITIES.includes(a)).slice(0, 40);
    }
    if (updates.customAmenities !== undefined) {
      updates.customAmenities = sanitizeCustomAmenities(updates.customAmenities, 15);
    }
    if (updates.houseRules && Array.isArray(updates.houseRules)) {
      updates.houseRules = updates.houseRules.filter((r: any) => typeof r === 'string').slice(0, 20);
    }
    if (updates.languagesSpoken && Array.isArray(updates.languagesSpoken)) {
      updates.languagesSpoken = updates.languagesSpoken.filter((l: any) => typeof l === 'string').slice(0, 10);
    }

    // Rooms replace the whole array when provided
    if (req.body.rooms !== undefined) {
      if (!Array.isArray(req.body.rooms) || req.body.rooms.length === 0) {
        res.status(400).json({ message: 'At least one room type is required' });
        return;
      }
      if (req.body.rooms.length > 50) {
        res.status(400).json({ message: 'A property cannot have more than 50 room types' });
        return;
      }
      const sanitizedRooms: IRoom[] = [];
      for (const raw of req.body.rooms) {
        const result = sanitizeRoom(raw);
        if ('error' in result) {
          res.status(400).json({ message: result.error });
          return;
        }
        sanitizedRooms.push(result);
      }
      updates.rooms = sanitizedRooms;
    }

    Object.assign(hotel, updates);
    await hotel.save();
    const updatedLean = hotel.toObject();

    res.status(200).json({ hotel: transformLean(updatedLean), message: 'Hotel listing updated successfully' });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join('. ') });
      return;
    }
    res.status(500).json({ message: 'Failed to update hotel listing', error: error.message });
  }
};

// @desc    Delete a hotel
// @route   DELETE /api/hotels/:id
// @access  Private (owner only)
export const deleteHotel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const currentUser = req.user as IUser;
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }
    if (String(hotel.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to delete this listing' });
      return;
    }

    if (hotel.coverImagePublicId) {
      await deleteImage(hotel.coverImagePublicId).catch(() => {});
    }
    for (const img of hotel.images || []) {
      if (img.publicId) await deleteImage(img.publicId).catch(() => {});
    }

    await Hotel.deleteOne({ _id: hotel._id });
    res.status(200).json({ message: 'Hotel listing deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete hotel listing', error: error.message });
  }
};

// @desc    Upload hotel cover image
// @route   POST /api/hotels/:id/upload-cover
// @access  Private (owner only)
export const uploadHotelCover = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const currentUser = req.user as IUser;
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }
    if (String(hotel.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to update this listing' });
      return;
    }

    if (hotel.coverImagePublicId) {
      await deleteImage(hotel.coverImagePublicId).catch(() => {});
    }

    const result = await uploadImage(req.file.buffer, {
      userId: String(currentUser._id),
      userEmail: currentUser.email,
      hotelId: id,
      type: 'hotel-cover',
      maxWidth: 1920,
      maxHeight: 1080,
    });

    hotel.coverImageUrl = result.url;
    hotel.coverImagePublicId = result.publicId;
    await hotel.save();

    res.status(200).json({ coverImageUrl: result.url, message: 'Cover image uploaded successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to upload cover image', error: error.message });
  }
};

// @desc    Upload additional hotel gallery photos (append)
// @route   POST /api/hotels/:id/upload-photos
// @access  Private (owner only)
export const uploadHotelPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const currentUser = req.user as IUser;
    const hotel = await Hotel.findById(id);
    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }
    if (String(hotel.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to update this listing' });
      return;
    }

    if ((hotel.images?.length || 0) + files.length > 30) {
      res.status(400).json({ message: 'A property cannot have more than 30 gallery images' });
      return;
    }

    for (const file of files) {
      const result = await uploadImage(file.buffer, {
        userId: String(currentUser._id),
        userEmail: currentUser.email,
        hotelId: id,
        type: 'hotel-photo',
        maxWidth: 1600,
        maxHeight: 1200,
      });
      hotel.images.push({ url: result.url, publicId: result.publicId });
    }
    await hotel.save();

    const leanHotel = hotel.toObject();
    res.status(200).json({ hotel: transformLean(leanHotel), message: 'Photos uploaded successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to upload photos', error: error.message });
  }
};

import mongoose, { Document, Schema } from 'mongoose';

// Accommodation types a host can list
export const HOTEL_PROPERTY_TYPES = [
  'hotel',
  'guesthouse',
  'apartment',
  'hostel',
  'villa',
  'resort',
  'bed_and_breakfast',
  'private_room',
] as const;

export type HotelPropertyType = typeof HOTEL_PROPERTY_TYPES[number];

// Room / bookable-unit types
export const ROOM_TYPES = [
  'single',
  'double',
  'twin',
  'triple',
  'family',
  'suite',
  'studio',
  'apartment',
  'dormitory',
] as const;

export type RoomType = typeof ROOM_TYPES[number];

// Amenities offered at the property level
export const HOTEL_AMENITIES = [
  'wifi',
  'parking',
  'pool',
  'gym',
  'spa',
  'restaurant',
  'bar',
  'breakfast',
  'air_conditioning',
  'heating',
  'kitchen',
  'laundry',
  'airport_shuttle',
  'pet_friendly',
  'family_friendly',
  'wheelchair_accessible',
  'beach_access',
  'room_service',
  'reception_24h',
  'non_smoking',
  'balcony',
  'sea_view',
  'mountain_view',
  'elevator',
  'jacuzzi',
  'private_pool',
  'minibar',
  'tv',
  'terrace',
  'kitchenette',
  'safe',
  'coffee_machine',
  'private_bathroom',
  'workspace',
] as const;

export type HotelAmenity = typeof HOTEL_AMENITIES[number];

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'RSD', 'MKD', 'BGN', 'RON'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const CANCELLATION_POLICIES = ['flexible', 'moderate', 'strict', 'non_refundable'] as const;
export type CancellationPolicy = typeof CANCELLATION_POLICIES[number];

export interface IRoom {
  name: string;
  roomType: RoomType;
  description?: string;
  maxGuests: number;
  beds: number;
  bathrooms: number;
  sizeSqm?: number;
  pricePerNight: number;
  currency: SupportedCurrency;
  quantity: number;
  amenities?: HotelAmenity[];
}

export interface IHotelImage {
  url: string;
  publicId?: string;
  caption?: string;
}

export interface IHotel extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  propertyType: HotelPropertyType;
  starRating?: number;
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  whatsapp?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  images: IHotelImage[];
  amenities: HotelAmenity[];
  rooms: IRoom[];
  priceFrom?: number;
  currency: SupportedCurrency;
  checkInTime?: string;
  checkOutTime?: string;
  minNights?: number;
  maxNights?: number;
  cancellationPolicy?: CancellationPolicy;
  houseRules?: string[];
  petsAllowed: boolean;
  smokingAllowed: boolean;
  languagesSpoken?: string[];
  isActive: boolean;
  isVerified: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: { values: ROOM_TYPES, message: 'Invalid room type: {VALUE}' },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Room description cannot exceed 1000 characters'],
    },
    maxGuests: {
      type: Number,
      required: [true, 'Maximum guests is required'],
      min: [1, 'A room must sleep at least 1 guest'],
      max: [30, 'Maximum guests cannot exceed 30'],
    },
    beds: {
      type: Number,
      required: [true, 'Number of beds is required'],
      min: [1, 'A room must have at least 1 bed'],
      max: [20, 'Number of beds cannot exceed 20'],
    },
    bathrooms: {
      type: Number,
      default: 1,
      min: [0, 'Bathrooms cannot be negative'],
      max: [10, 'Bathrooms cannot exceed 10'],
    },
    sizeSqm: {
      type: Number,
      min: [1, 'Room size must be positive'],
      max: [2000, 'Room size cannot exceed 2000 m²'],
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [1, 'Price per night must be at least 1'],
      max: [1000000, 'Price per night is unrealistically high'],
    },
    currency: {
      type: String,
      enum: { values: SUPPORTED_CURRENCIES, message: 'Invalid currency: {VALUE}' },
      default: 'EUR',
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
      max: [500, 'Quantity cannot exceed 500'],
    },
    amenities: [{
      type: String,
      enum: { values: HOTEL_AMENITIES, message: 'Invalid amenity: {VALUE}' },
    }],
  },
  { _id: true }
);

const HotelImageSchema = new Schema<IHotelImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    caption: { type: String, trim: true, maxlength: [200, 'Caption cannot exceed 200 characters'] },
  },
  { _id: false }
);

const HotelSchema: Schema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: [120, 'Property name cannot exceed 120 characters'],
      index: true,
    },
    slug: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    propertyType: {
      type: String,
      required: [true, 'Property type is required'],
      enum: { values: HOTEL_PROPERTY_TYPES, message: 'Invalid property type: {VALUE}' },
      index: true,
    },
    starRating: {
      type: Number,
      min: [1, 'Star rating must be between 1 and 5'],
      max: [5, 'Star rating must be between 1 and 5'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
    },
    whatsapp: {
      type: String,
      trim: true,
      maxlength: [30, 'WhatsApp number cannot exceed 30 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      index: true,
    },
    latitude: { type: Number },
    longitude: { type: Number },
    coverImageUrl: { type: String },
    coverImagePublicId: { type: String },
    images: {
      type: [HotelImageSchema],
      default: [],
      validate: {
        validator: (arr: IHotelImage[]) => arr.length <= 30,
        message: 'A property cannot have more than 30 images',
      },
    },
    amenities: [{
      type: String,
      enum: { values: HOTEL_AMENITIES, message: 'Invalid amenity: {VALUE}' },
    }],
    rooms: {
      type: [RoomSchema],
      default: [],
      validate: {
        validator: (arr: IRoom[]) => arr.length >= 1 && arr.length <= 50,
        message: 'A property must have between 1 and 50 room types',
      },
    },
    priceFrom: { type: Number, min: 0 },
    currency: {
      type: String,
      enum: { values: SUPPORTED_CURRENCIES, message: 'Invalid currency: {VALUE}' },
      default: 'EUR',
    },
    checkInTime: { type: String, trim: true, maxlength: 10 },
    checkOutTime: { type: String, trim: true, maxlength: 10 },
    minNights: { type: Number, min: [1, 'Minimum nights must be at least 1'], max: 365 },
    maxNights: { type: Number, min: [1, 'Maximum nights must be at least 1'], max: 365 },
    cancellationPolicy: {
      type: String,
      enum: { values: CANCELLATION_POLICIES, message: 'Invalid cancellation policy: {VALUE}' },
    },
    houseRules: [{
      type: String,
      trim: true,
      maxlength: [200, 'A house rule cannot exceed 200 characters'],
    }],
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    languagesSpoken: [{
      type: String,
      trim: true,
      maxlength: [50, 'Language name cannot exceed 50 characters'],
    }],
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.coverImagePublicId;
        if (Array.isArray(ret.images)) {
          ret.images = ret.images.map((img: any) => {
            const { publicId, ...rest } = img;
            return rest;
          });
        }
        return ret;
      },
    },
    toObject: {
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Text index for search
HotelSchema.index({ name: 'text', description: 'text' });

// Compound indexes for common queries
HotelSchema.index({ propertyType: 1, city: 1, isActive: 1 });
HotelSchema.index({ country: 1, city: 1, isActive: 1 });
HotelSchema.index({ priceFrom: 1, isActive: 1 });

// Derive priceFrom (cheapest room) before saving and generate slug
HotelSchema.pre<IHotel>('save', async function (next) {
  // Derive priceFrom from cheapest room
  if (Array.isArray(this.rooms) && this.rooms.length > 0) {
    this.priceFrom = this.rooms.reduce(
      (min, room) => (room.pricePerNight < min ? room.pricePerNight : min),
      this.rooms[0].pricePerNight
    );
    // Adopt the currency of the cheapest room for consistency
    const cheapest = this.rooms.reduce((a, b) => (a.pricePerNight <= b.pricePerNight ? a : b));
    if (cheapest?.currency) this.currency = cheapest.currency;
  }

  if (!this.slug || this.isModified('name') || this.isModified('country')) {
    const baseSlug = `${this.country}-${this.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const HotelModel = this.constructor as any;
    let slug = baseSlug;
    let attempts = 0;
    while (await HotelModel.findOne({ slug, _id: { $ne: this._id } }).lean()) {
      attempts++;
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${baseSlug}-${suffix}`;
      if (attempts > 10) break;
    }
    this.slug = slug;
  }
  next();
});

const Hotel = mongoose.model<IHotel>('Hotel', HotelSchema);

export default Hotel;

import { Request, Response } from 'express';
import HotelBooking, { BOOKING_STATUSES } from '../models/HotelBooking';
import Hotel from '../models/Hotel';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { encodeId, resolveId } from '../utils/idObfuscation';
import { getParam } from '../utils/validateParams';

const DAY_MS = 86_400_000;

/** Map a booking document to the frontend shape (obfuscated ids, nested hotel summary). */
const transformBooking = (doc: any) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, owner, guest, hotel, ...rest } = obj;
  const hotelSummary = hotel && typeof hotel === 'object' && hotel._id
    ? { id: encodeId(String(hotel._id)), name: hotel.name, slug: hotel.slug, city: hotel.city, country: hotel.country, coverImageUrl: hotel.coverImageUrl }
    : undefined;
  return {
    id: encodeId(String(_id)),
    hotel: hotelSummary,
    ...rest,
  };
};

// @desc    Create a booking request (guest → host). Auth optional.
// @route   POST /api/hotel-bookings
// @access  Public
export const createHotelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawHotelId = req.body.hotelId;
    if (!rawHotelId) {
      res.status(400).json({ message: 'Hotel ID is required' });
      return;
    }
    const hotelId = resolveId(rawHotelId) || rawHotelId;
    const hotel = await Hotel.findById(hotelId);
    if (!hotel || !hotel.isActive) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Resolve the requested room (by name) from the property's current rooms.
    const roomName = typeof req.body.roomName === 'string' ? req.body.roomName.trim() : '';
    const room = hotel.rooms.find((r) => r.name === roomName) || hotel.rooms[0];
    if (!room) {
      res.status(400).json({ message: 'This property has no bookable rooms' });
      return;
    }

    // Dates
    const checkIn = new Date(req.body.checkIn);
    const checkOut = new Date(req.body.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      res.status(400).json({ message: 'Valid check-in and check-out dates are required' });
      return;
    }
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
    if (nights < 1) {
      res.status(400).json({ message: 'Check-out must be after check-in' });
      return;
    }
    if (hotel.minNights && nights < hotel.minNights) {
      res.status(400).json({ message: `This property requires a minimum of ${hotel.minNights} nights` });
      return;
    }

    // Guests
    const guests = Number(req.body.guests);
    if (!Number.isFinite(guests) || guests < 1) {
      res.status(400).json({ message: 'At least one guest is required' });
      return;
    }
    if (guests > room.maxGuests) {
      res.status(400).json({ message: `This room sleeps up to ${room.maxGuests} guests` });
      return;
    }

    // Guest contact
    const guestName = typeof req.body.guestName === 'string' ? req.body.guestName.trim() : '';
    const guestPhone = typeof req.body.guestPhone === 'string' ? req.body.guestPhone.trim() : '';
    if (!guestName) {
      res.status(400).json({ message: 'Your name is required' });
      return;
    }
    if (!guestPhone || guestPhone.replace(/\D/g, '').length < 6) {
      res.status(400).json({ message: 'A valid phone number is required' });
      return;
    }

    const booking = await HotelBooking.create({
      hotel: hotel._id,
      owner: hotel.owner,
      guest: req.user ? (req.user as IUser)._id : undefined,
      roomName: room.name,
      roomType: room.roomType,
      checkIn,
      checkOut,
      nights,
      guests,
      pricePerNight: room.pricePerNight,
      totalPrice: room.pricePerNight * nights,
      currency: room.currency,
      guestName,
      guestPhone,
      guestEmail: typeof req.body.guestEmail === 'string' ? req.body.guestEmail.trim() : undefined,
      message: typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 1000) : undefined,
      status: 'pending',
    });

    res.status(201).json({ booking: transformBooking(booking), message: 'Booking request sent' });
  } catch (error: any) {
    apiLogger.error('Create hotel booking error:', error);
    res.status(500).json({ message: 'Failed to send booking request' });
  }
};

// @desc    List booking requests for the signed-in host's properties
// @route   GET /api/hotel-bookings/host
// @access  Private
export const getHostBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const ownerId = String((req.user as IUser)._id);
    const statusFilter = typeof req.query.status === 'string' && BOOKING_STATUSES.includes(req.query.status as any)
      ? { status: req.query.status }
      : {};

    const bookings = await HotelBooking.find({ owner: ownerId, ...statusFilter })
      .populate({ path: 'hotel', select: 'name slug city country coverImageUrl' })
      .sort({ createdAt: -1 })
      .limit(200);

    const pendingCount = await HotelBooking.countDocuments({ owner: ownerId, status: 'pending' });

    res.json({ bookings: bookings.map(transformBooking), pendingCount });
  } catch (error: any) {
    apiLogger.error('Get host bookings error:', error);
    res.status(500).json({ message: 'Error fetching booking requests' });
  }
};

// @desc    Update a booking request status (host only)
// @route   PATCH /api/hotel-bookings/:id/status
// @access  Private
export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const raw = getParam(req, 'id');
    const bookingId = resolveId(raw) || raw;
    const status = req.body.status;
    if (!BOOKING_STATUSES.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }
    const booking = await HotelBooking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    if (String(booking.owner) !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to manage this booking' });
      return;
    }
    booking.status = status;
    await booking.save();
    res.json({ booking: transformBooking(booking), message: 'Booking updated' });
  } catch (error: any) {
    apiLogger.error('Update booking status error:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};

/**
 * Hotel model & query-filter integration tests.
 * Verifies that hotel listings persist to the database and that the
 * filter/sort logic used by the controller returns the right documents.
 */

import mongoose from 'mongoose';
import Hotel from '../models/Hotel';

const baseHotel = (overrides: Record<string, any> = {}) => ({
  owner: new mongoose.Types.ObjectId(),
  name: 'Test Property',
  propertyType: 'hotel',
  contactPhone: '+38344123456',
  city: 'Prishtina',
  country: 'Kosovo',
  amenities: ['wifi', 'parking'],
  rooms: [
    { name: 'Standard Double', roomType: 'double', maxGuests: 2, beds: 1, bathrooms: 1, pricePerNight: 60, currency: 'EUR', quantity: 3 },
    { name: 'Family Suite', roomType: 'family', maxGuests: 4, beds: 2, bathrooms: 1, pricePerNight: 120, currency: 'EUR', quantity: 1 },
  ],
  ...overrides,
});

describe('Hotel model persistence', () => {
  it('saves a hotel to the database with all details', async () => {
    const created = await Hotel.create(baseHotel());

    const found = await Hotel.findById(created._id).lean();
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Test Property');
    expect(found!.rooms).toHaveLength(2);
    expect(found!.amenities).toEqual(expect.arrayContaining(['wifi', 'parking']));
    // slug auto-generated
    expect(found!.slug).toMatch(/kosovo-test-property/);
  });

  it('derives priceFrom from the cheapest room on save', async () => {
    const created = await Hotel.create(baseHotel());
    expect(created.priceFrom).toBe(60);
  });

  it('rejects a hotel with no rooms', async () => {
    await expect(Hotel.create(baseHotel({ rooms: [] }))).rejects.toThrow();
  });

  it('rejects an invalid room price', async () => {
    await expect(
      Hotel.create(baseHotel({ rooms: [{ name: 'Bad', roomType: 'double', maxGuests: 2, beds: 1, pricePerNight: 0, currency: 'EUR' }] }))
    ).rejects.toThrow();
  });
});

describe('Hotel query filters', () => {
  beforeEach(async () => {
    await Hotel.create(baseHotel({ name: 'Cheap Hostel', propertyType: 'hostel', city: 'Tirana', country: 'Albania', amenities: ['wifi'], rooms: [{ name: 'Dorm', roomType: 'dormitory', maxGuests: 6, beds: 6, bathrooms: 1, pricePerNight: 15, currency: 'EUR', quantity: 2 }] }));
    await Hotel.create(baseHotel({ name: 'Luxury Resort', propertyType: 'resort', city: 'Prishtina', country: 'Kosovo', amenities: ['wifi', 'pool', 'spa'], rooms: [{ name: 'Suite', roomType: 'suite', maxGuests: 2, beds: 1, bathrooms: 2, pricePerNight: 300, currency: 'EUR', quantity: 5 }] }));
    await Hotel.create(baseHotel({ name: 'Mid Hotel', propertyType: 'hotel', city: 'Prishtina', country: 'Kosovo', amenities: ['wifi', 'parking'] }));
  });

  it('filters by property type', async () => {
    const results = await Hotel.find({ isActive: true, propertyType: 'resort' }).lean();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Luxury Resort');
  });

  it('filters by city (case-insensitive)', async () => {
    const results = await Hotel.find({ isActive: true, city: { $regex: new RegExp('^prishtina$', 'i') } }).lean();
    expect(results).toHaveLength(2);
  });

  it('filters by price range (priceFrom)', async () => {
    const results = await Hotel.find({ isActive: true, priceFrom: { $gte: 20, $lte: 100 } }).lean();
    expect(results.map((r) => r.name).sort()).toEqual(['Mid Hotel', 'Test Property'].sort());
  });

  it('filters by amenities ($all)', async () => {
    const results = await Hotel.find({ isActive: true, amenities: { $all: ['wifi', 'pool'] } }).lean();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Luxury Resort');
  });

  it('filters by guest capacity (a room sleeps >= n)', async () => {
    const results = await Hotel.find({ isActive: true, 'rooms.maxGuests': { $gte: 6 } }).lean();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Cheap Hostel');
  });

  it('sorts by price ascending', async () => {
    const results = await Hotel.find({ isActive: true }).sort({ priceFrom: 1 }).lean();
    const prices = results.map((r) => r.priceFrom);
    expect(prices).toEqual([...prices].sort((a, b) => (a as number) - (b as number)));
  });
});

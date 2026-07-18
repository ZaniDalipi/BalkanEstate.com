export { hotelsKeys } from './hotelsKeys';
export {
  getHotels,
  getHotel,
  getMyHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  uploadHotelCover,
  uploadHotelPhotos,
  uploadRoomImage,
  validateHotelCode,
  generateHotelCodes,
  getHotelCodes,
  revokeHotelCode,
} from './hotelsApi';
export {
  getHotelFavorites,
  toggleHotelFavorite,
  checkHotelFavorite,
} from './hotelFavoritesApi';
export {
  createBooking,
  getHostBookings,
  updateBookingStatus,
} from './hotelBookingsApi';

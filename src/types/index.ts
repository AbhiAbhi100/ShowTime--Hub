export interface Movie {

  id: string; // TMDB ID (mapped from _id if needed) OR Sequelize ID
  title: string;
  posterUrl?: string; // Backend field
  poster?: string; // Frontend legacy field (often mapped from posterUrl)
  bannerUrl?: string; // Backend field
  banner?: string; // Frontend legacy field
  language: string;
  genre: string[];
  duration: string;
  rating: number;
  releaseDate: string | Date;
  description: string;
  cast: { name: string; profile?: string; character?: string }[];
  director: string;
  trailerUrl?: string;
  isIndian?: boolean;
}

export interface Theatre {

  id: string;
  name: string;
  city: string | { id: string; name: string };
  address: string;
  amenities: string[];
  image?: string;
}

export interface SeatLayoutType {
  label: string;
  price: number;
  rows: number[]; // [1, 2, 3] indicating which rows (1-indexed) belong to this type
}

export interface SeatLayout {
  rows: number;
  cols: number;
  rowLabels: string[]; // ["A", "B", "C"]
  types: { [key: string]: SeatLayoutType } | SeatLayoutType[]; // Map of type name to config
  gapRows: number[];
  gapCols: number[];
  unavailableSeats: string[]; // ["A1", "B5"]
}

export interface Screen {

  id: string;
  name: string;
  theatre: string | Theatre;
  seatLayout: SeatLayout;
}

// Seat interface for UI state
export interface Seat {
  id: string; // "A1"
  row: string; // "A"
  number: number; // 1
  status: "available" | "selected" | "booked" | "unavailable";
  price: number;
  type: string; // "Standard", "Premium"
}

export interface Show {

  id: string;
  movieId: string;
  movie: Movie | string;
  theatre: Theatre | string;
  screen: Screen | string; // Populated screen is crucial for layout
  showDate: string; // ISO Date string
  showTime: string; // "14:00"
  prices: { [key: string]: number }; // Map of seat types to prices
  // Virtuals/Legacy for UI compatibility
  priceRegular?: number;
  pricePremium?: number;
  priceVip?: number;
  totalSeats: number;
  availableSeats: number;
  bookedSeatIds: string[];
  isActive: boolean;
}

export interface City {

  id: string;
  name: string;
  code: string;
  state: string;
  image?: string;
  isActive: boolean;
}

export interface User {

  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  phone?: string;
}

export interface Booking {

  id: string;
  bookingId: string;
  user: User | string;
  show: Show | string;
  seats: string[]; // ["A1", "A2"]
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentId?: string;
  createdAt: string;
}

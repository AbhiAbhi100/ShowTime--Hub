export interface Movie {
  id: string;
  title: string;
  poster: string;
  banner: string;
  language: string;
  genre: string[];
  duration: string;
  rating: number;
  releaseDate: string;
  description: string;
  cast: string[];
  director: string;
  trailerUrl?: string;
}

export interface Theatre {
  id: string;
  name: string;
  location: string;
  shows: Show[];
}

export interface Show {
  id: string;
  time: string;
  price: number;
  availableSeats: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: "available" | "selected" | "booked";
  price: number;
}

export interface Booking {
  id: string;
  movie: Movie;
  theatre: Theatre;
  show: Show;
  seats: Seat[];
  totalAmount: number;
  bookingDate: string;
}

// Cities are now fetched from the database
// Movies are now fetched from TMDB API and database
// Theatres are now fetched from the database
// Shows are now fetched from the database

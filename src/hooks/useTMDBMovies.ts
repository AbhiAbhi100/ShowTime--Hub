import { useQuery } from "@tanstack/react-query";
import { moviesApi } from "@/lib/api";
import type { Movie } from "@/types";

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

// Helper to map mixed data sources (Backend TMDB proxy, Backend DB, Raw TMDB) to Movie interface
const mapToMovie = (data: any): Movie => {
  // Handle Genre Mapping
  let genres: string[] = [];
  if (Array.isArray(data.genre)) {
    // Check if it's already strings or numbers (IDs)
    if (typeof data.genre[0] === 'string') {
        genres = data.genre;
    } else if (typeof data.genre[0] === 'number') {
        genres = data.genre.map((g: number) => GENRE_MAP[g] || "Unknown");
    }
  } else if (Array.isArray(data.genre_ids)) {
     genres = data.genre_ids.map((g: number) => GENRE_MAP[g] || "Unknown");
  } else if (Array.isArray(data.genres)) {
      genres = data.genres.map((g: any) => g.name);
  }

  return {
    _id: String(data._id || data.id),
    id: String(data.id || data._id),
    title: data.title,
    // Prioritize pre-calculated URLs (from Backend), then construct from paths (Raw TMDB)
    poster: data.poster || data.posterUrl || (data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : undefined),
    posterUrl: data.posterUrl || data.poster || (data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : undefined),
    banner: data.banner || data.bannerUrl || (data.backdrop_path ? `${IMAGE_BASE_URL}${data.backdrop_path}` : undefined),
    bannerUrl: data.bannerUrl || data.banner || (data.backdrop_path ? `${IMAGE_BASE_URL}${data.backdrop_path}` : undefined),
    
    language: data.language || data.original_language || "Unknown",
    genre: genres,
    duration: data.duration || (data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : "TBA"),
    rating: data.rating || (data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0),
    releaseDate: data.releaseDate || data.release_date,
    description: data.description || data.overview,
    
    cast: data.cast || data.credits?.cast?.slice(0, 10).map((c: any) => ({
       name: c.name,
       character: c.character,
       profile: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : undefined
    })) || [],
    director: data.director || data.credits?.crew?.find((c: any) => c.job === "Director")?.name || "Unknown",
    trailerUrl: data.trailerUrl || (data.videos?.results?.find((v: any) => v.type === "Trailer")?.key 
        ? `https://www.youtube.com/watch?v=${data.videos.results.find((v: any) => v.type === "Trailer").key}` 
        : undefined),
  };
};

export const useTMDBMovies = (
  endpoint: "upcoming" | "now_playing" | "popular" | "recent" = "upcoming",
  category: "all" | "indian" | "hollywood" = "all"
) => {
  return useQuery({
    queryKey: ["tmdb-movies", endpoint, category],
    queryFn: async (): Promise<Movie[]> => {
      const response = await moviesApi.getTMDB(endpoint, category);
      const movies = response.data;
      return movies.map(mapToMovie);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useTMDBMovieDetails = (movieId: string | undefined) => {
  return useQuery({
    queryKey: ["tmdb-movie", movieId],
    queryFn: async (): Promise<Movie> => {
      const response = await moviesApi.getTMDBMovie(movieId!);
      return mapToMovie(response.data);
    },
    enabled: !!movieId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useTMDBSearch = (query: string) => {
  return useQuery({
    queryKey: ["tmdb-search", query],
    queryFn: async (): Promise<Movie[]> => {
      if (!query) return [];
      const response = await moviesApi.searchTMDB(query);
      return response.data.map(mapToMovie);
    },
    enabled: !!query,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

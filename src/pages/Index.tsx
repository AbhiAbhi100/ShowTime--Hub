import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { MovieCard } from "@/components/movies/MovieCard";
import { FeaturedCarousel } from "@/components/movies/FeaturedCarousel";
import { TrailerModal } from "@/components/movies/TrailerModal";
import { useTMDBMovies, useTMDBSearch } from "@/hooks/useTMDBMovies";
import {
  Film,
  TrendingUp,
  Clapperboard,
  Globe,
  Ticket,
  Sparkles,
  Star,
  Popcorn,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Movie } from "@/types";
import { adminApi, moviesApi } from "@/lib/api";

const FloatingElement = ({
  children,
  delay = 0,
  duration = 3,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    animate={{
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    {children}
  </motion.div>
);

const GlowOrb = ({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const Index = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [movieCategory, setMovieCategory] = useState<"indian" | "hollywood">(
    "indian"
  );
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  // Ensure hook is called unconditionally, but enabled conditionally
  const { data: recentMovies = [], isLoading: isLoadingRecent, error: errorRecent } = useTMDBMovies("recent", movieCategory);
  
  // Search Hook
  const { data: searchResults = [], isLoading: isLoadingSearch, error: errorSearch } = useTMDBSearch(searchQuery);

  // Determine which movies to show
  const movies = searchQuery ? searchResults : recentMovies;
  const isLoading = searchQuery ? isLoadingSearch : isLoadingRecent;
  const error = searchQuery ? errorSearch : errorRecent;

  // Fetch admin-managed featured movies
  useEffect(() => {
    const fetchFeaturedMovies = async () => {
      try {
        const response = await adminApi.getFeaturedMovies();
        const featured = response.data || [];

        if (featured.length > 0) {
          // Fetch full movie details for each featured movie
          const movieDetails = await Promise.all(
            featured.map(async (fm: any) => {
              try {
                if (fm.movieType === "tmdb") {
                  const res = await moviesApi.getTMDBMovie(fm.movieId);
                  return res.data;
                } else {
                  const res = await moviesApi.getCustomMovie(fm.movieId);
                  return {
                    ...res.data,
                    id: res.data.id,
                    poster: res.data.posterUrl,
                    banner: res.data.bannerUrl,
                    isCustom: true, // Mark as custom to bypass booking restrictions
                  };
                }
              } catch (err) {
                console.error(`Failed to fetch movie ${fm.movieId}:`, err);
                return null;
              }
            })
          );
          setFeaturedMovies(movieDetails.filter(Boolean));
        }
      } catch (error) {
        console.error("Failed to fetch featured movies:", error);
        // Fallback to first 5 movies if no featured movies set
      }
      setFeaturedLoading(false);
    };

    fetchFeaturedMovies();
  }, []);

  // Use featured movies from admin, or fallback to first 5 from TMDB
  const carouselMovies =
    featuredMovies.length > 0 ? featuredMovies : movies.slice(0, 5);

  const handlePlayTrailer = (movie: Movie) => {
    setTrailerMovie(movie);
    setIsTrailerOpen(true);
  };

  const handleCloseTrailer = () => {
    setIsTrailerOpen(false);
    setTrailerMovie(null);
  };

  // Filter movies by category (Only if NOT searching, or if you want to filter search results too)
  // If searching, we usually ignore category tabs unless valid
  const categorizedMovies = useMemo(() => {
    if (searchQuery) return movies; // Return raw search results, ignoring category tabs? 
    // OR we can still filter search results by category if needed.
    // Let's allow category filtering on search results too if desired, usually Search overrides tabs.
    // For simplicity, let's respect Tabs even on Search Results if they have language metadata
    
    return movies.filter((m) => {
      const isIndian =
        m.language?.toLowerCase() === "hindi" ||
        m.language?.toLowerCase() === "tamil" ||
        m.language?.toLowerCase() === "telugu" ||
        m.language?.toLowerCase() === "malayalam" ||
        m.language?.toLowerCase() === "kannada" ||
        m.language?.toLowerCase() === "bengali" ||
        m.language?.toLowerCase() === "marathi";
      
      // If searching, maybe show ALL results regardless of tab?
      // User query "Avatar" might be Hollywood. If tab is Indian, they see nothing.
      if (searchQuery) return true;

      // Backend now handles filtering for these categories, so we can pass everything
      if (movieCategory === "indian" || movieCategory === "hollywood") return true;

      // Fallback for any legacy logic
      return movieCategory === "indian" ? isIndian : !isIndian;
    });
  }, [movies, movieCategory, searchQuery]);

  const genres = useMemo(() => {
    const allGenres = categorizedMovies.flatMap((m) => m.genre);
    return ["all", ...Array.from(new Set(allGenres))];
  }, [categorizedMovies]);

  const filteredMovies = useMemo(() => {
    let result = categorizedMovies;

    // Search query filtering is now handled by API, but we keep this for client-side refinement if needed
    // But since API returns exact matches, we don't need fuzzy filter here unless we want to filter within results.
    // API search is broad. Client filter is exact.
    // Removing client-side filtering for title if we use API search.
    
    if (activeFilter !== "all") {
      result = result.filter((m) => m.genre.includes(activeFilter));
    }

    return result;
  }, [categorizedMovies, activeFilter]);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Featured Carousel */}
      {!isLoading && !featuredLoading && carouselMovies.length > 0 && (
        <FeaturedCarousel
          movies={carouselMovies}
          onPlayTrailer={handlePlayTrailer}
        />
      )}

      {/* Loading Carousel Skeleton */}
      {(isLoading || featuredLoading) && (
        <section className="relative h-[70vh] md:h-[80vh] overflow-hidden bg-secondary/20">
          <div className="absolute inset-0 flex items-center">
            <div className="container">
              <div className="max-w-2xl space-y-6">
                <Skeleton className="h-8 w-48 rounded-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-36" />
                  <Skeleton className="h-12 w-36" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Movies Section */}
      <section className="container py-16">
        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10"
        >
          <Tabs
            value={movieCategory}
            onValueChange={(v) => {
              setMovieCategory(v as "indian" | "hollywood");
              setActiveFilter("all");
            }}
          >
            <TabsList className="bg-secondary/50 backdrop-blur-md p-1.5 border border-border/50">
              <TabsTrigger
                value="indian"
                className="gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-300"
              >
                <Clapperboard className="h-4 w-4" />
                Indian Movies
              </TabsTrigger>
              <TabsTrigger
                value="hollywood"
                className="gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-300"
              >
                <Globe className="h-4 w-4" />
                Hollywood
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-3xl tracking-wide text-foreground">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : movieCategory === "indian"
                  ? "Indian Cinema"
                  : "Hollywood"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isLoading
                  ? "Loading amazing movies..."
                  : `${filteredMovies.length} movies available`}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Genre Filters */}
        {!isLoading && movies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap gap-3 mb-10 pb-6 border-b border-border/50"
          >
            {genres.map((genre, i) => (
              <motion.button
                key={genre}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter(genre)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeFilter === genre
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-secondary/50 backdrop-blur-sm text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
                }`}
              >
                {genre === "all" ? "All Movies" : genre}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="space-y-3"
              >
                <Skeleton className="aspect-[2/3] w-full rounded-xl animate-pulse" />
                <Skeleton className="h-4 w-3/4 animate-pulse" />
                <Skeleton className="h-3 w-1/2 animate-pulse" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <Film className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="font-display text-3xl text-foreground mb-3">
              Failed to Load Movies
            </h3>
            <p className="text-muted-foreground max-w-md">
              Please check your TMDB API key and try again
            </p>
          </motion.div>
        )}

        {/* Movie Grid */}
        {!isLoading && !error && filteredMovies.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredMovies.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.03,
                    ease: "easeOut",
                  }}
                >
                  <MovieCard movie={movie} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredMovies.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Film className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-display text-3xl text-foreground mb-3">
              No Movies Found
            </h3>
            <p className="text-muted-foreground max-w-md">
              Try adjusting your search or filter criteria
            </p>
          </motion.div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-gradient-to-b from-card/50 to-background">
        <div className="container py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Film className="h-7 w-7 text-primary" />
              </div>
              <span className="font-display text-2xl tracking-wider">
                CINEMAX
              </span>
            </motion.div>
            <p className="text-sm text-muted-foreground">
              © 2024 CineMax. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Trailer Modal */}
      <TrailerModal
        movie={trailerMovie}
        isOpen={isTrailerOpen}
        onClose={handleCloseTrailer}
      />
    </div>
  );
};

export default Index;

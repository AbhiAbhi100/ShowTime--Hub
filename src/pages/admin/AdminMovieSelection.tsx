import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Check,
  X,
  Film,
  Star,
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { moviesApi, adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TMDBMovie {
  id: number | string;
  title: string;
  poster_path?: string | null;
  poster?: string | null;
  backdrop_path?: string | null;
  banner?: string | null;
  release_date?: string;
  releaseDate?: string;
  vote_average?: number;
  rating?: number;
  overview?: string;
  description?: string;
  genre_ids?: number[];
  genre?: string[];
}

interface FeaturedMovie {
  id: string;
  movieId: string;
  movieType: "tmdb" | "custom";
  title: string;
  poster: string;
  isActive: boolean;
  displayOrder: number;
}

const AdminMovieSelection = () => {
  const [tmdbMovies, setTmdbMovies] = useState<TMDBMovie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<FeaturedMovie[]>([]);
  const [customMovies, setCustomMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("now_playing");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [category]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tmdbRes, customRes, featuredRes] = await Promise.all([
        moviesApi.getTMDB(category, "all"),
        moviesApi.getCustom(),
        adminApi.getFeaturedMovies().catch(() => ({ data: [] })),
      ]);
      // API returns array directly, not nested in results
      const tmdbData = tmdbRes.data;
      setTmdbMovies(
        Array.isArray(tmdbData) ? tmdbData : tmdbData.results || []
      );
      setCustomMovies(customRes.data || []);
      setFeaturedMovies(featuredRes.data || []);
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    }
    setLoading(false);
  };

  const toggleFeatured = async (
    movieId: string,
    movieType: "tmdb" | "custom",
    title: string,
    poster: string
  ) => {
    try {
      const existing = featuredMovies.find(
        (m) => m.movieId === movieId && m.movieType === movieType
      );
      if (existing) {
        await adminApi.removeFeaturedMovie(existing.id);
        toast({ title: `"${title}" removed from featured movies` });
      } else {
        await adminApi.addFeaturedMovie({
          movieId,
          movieType,
          title,
          poster,
        });
        toast({ title: `"${title}" added to featured movies` });
      }
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update featured movies",
        description: error.response?.data?.error || "An error occurred",
      });
    }
  };

  const isFeatured = (movieId: string, movieType: "tmdb" | "custom") => {
    return featuredMovies.some(
      (m) => m.movieId === movieId && m.movieType === movieType
    );
  };

  const filteredTmdbMovies = tmdbMovies.filter((movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomMovies = customMovies.filter((movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getImageUrl = (movie: TMDBMovie) => {
    // Handle both raw TMDB format and our transformed format
    if (movie.poster) return movie.poster;
    if (movie.poster_path)
      return `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
    return "https://via.placeholder.com/200x300?text=No+Image";
  };

  const getRating = (movie: TMDBMovie) => {
    return movie.rating || movie.vote_average || 0;
  };

  return (
    <AdminLayout title="Movie Selection">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {featuredMovies.length} movies featured
            </span>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Featured Movies Preview */}
        {featuredMovies.length > 0 && (
          <div className="glass-card rounded-xl border border-border/50 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              Currently Featured on Website
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {featuredMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="relative flex-shrink-0 w-24 group"
                >
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-24 h-36 object-cover rounded-lg"
                  />
                  <button
                    onClick={() =>
                      toggleFeatured(
                        movie.movieId,
                        movie.movieType,
                        movie.title,
                        movie.poster
                      )
                    }
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-xs mt-1 truncate">{movie.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="tmdb" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tmdb">TMDB Movies</TabsTrigger>
            <TabsTrigger value="custom">Custom Movies</TabsTrigger>
          </TabsList>

          <TabsContent value="tmdb">
            {/* Category filter for TMDB */}
            <div className="flex gap-2 mb-4">
              {[
                { key: "now_playing", label: "Now Playing" },
                { key: "upcoming", label: "Upcoming" },
                { key: "popular", label: "Popular" },
                { key: "top_rated", label: "Top Rated" },
              ].map((cat) => (
                <Button
                  key={cat.key}
                  variant={category === cat.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(cat.key)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-muted rounded-xl h-64"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredTmdbMovies.map((movie) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group"
                  >
                    <div
                      className={`rounded-xl overflow-hidden border-2 transition-colors ${
                        isFeatured(movie.id.toString(), "tmdb")
                          ? "border-primary"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={getImageUrl(movie)}
                        alt={movie.title}
                        className="w-full aspect-[2/3] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                        <h4 className="text-sm font-medium text-white truncate">
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {getRating(movie).toFixed(1)}
                        </div>
                        <Button
                          size="sm"
                          className={`w-full mt-2 ${
                            isFeatured(movie.id.toString(), "tmdb")
                              ? "bg-destructive hover:bg-destructive/90"
                              : "gradient-primary"
                          }`}
                          onClick={() =>
                            toggleFeatured(
                              movie.id.toString(),
                              "tmdb",
                              movie.title,
                              getImageUrl(movie)
                            )
                          }
                        >
                          {isFeatured(movie.id.toString(), "tmdb") ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" /> Remove
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" /> Feature
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {isFeatured(movie.id.toString(), "tmdb") && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-primary">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom">
            {customMovies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No custom movies added yet</p>
                <Button
                  variant="link"
                  onClick={() => (window.location.href = "/admin/movies")}
                >
                  Add custom movies
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredCustomMovies.map((movie) => {
                  const posterUrl =
                    movie.posterUrl ||
                    movie.poster ||
                    "https://via.placeholder.com/200x300";
                  return (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <div
                        className={`rounded-xl overflow-hidden border-2 transition-colors ${
                          isFeatured(movie.id, "custom")
                            ? "border-primary"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={posterUrl}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                          <h4 className="text-sm font-medium text-white truncate">
                            {movie.title}
                          </h4>
                          <Button
                            size="sm"
                            className={`w-full mt-2 ${
                              isFeatured(movie.id, "custom")
                                ? "bg-destructive hover:bg-destructive/90"
                                : "gradient-primary"
                            }`}
                            onClick={() =>
                              toggleFeatured(
                                movie.id,
                                "custom",
                                movie.title,
                                posterUrl
                              )
                            }
                          >
                            {isFeatured(movie.id, "custom") ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" /> Remove
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" /> Feature
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      {isFeatured(movie.id, "custom") && (
                        <div className="absolute top-2 right-2 p-1 rounded-full bg-primary">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMovieSelection;

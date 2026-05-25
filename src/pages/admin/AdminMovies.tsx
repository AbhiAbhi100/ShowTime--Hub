import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Film,
  Image,
  Loader2,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { moviesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce"; // Assuming this exists or I'll implement a simple one inside

interface Movie {
  id: string;
  tmdbId?: string;
  title: string;
  description?: string;
  poster?: string;
  banner?: string;
  language: string;
  genre: string[];
  duration?: string;
  rating?: number;
  releaseDate?: string;
  certificate?: string;
  cast?: string[];
  director?: string;
  isActive: boolean;
}

const initialFormData = {
  tmdbId: "",
  title: "",
  description: "",
  poster: "",
  banner: "",
  language: "Hindi",
  genre: [] as string[],
  duration: "",
  rating: 0,
  releaseDate: "",
  certificate: "UA",
  cast: "",
  director: "",
};

const languages = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Punjabi",
];
const certificates = ["U", "UA", "A", "S"];
const genreOptions = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Romance",
  "Thriller",
  "Sci-Fi",
  "Adventure",
  "Animation",
  "Crime",
  "Fantasy",
  "Mystery",
];

const AdminMovies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  // Autocomplete states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingTMDB, setIsSearchingTMDB] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await moviesApi.getCustom();
      if (Array.isArray(response.data)) {
        setMovies(response.data);
      } else {
        console.error("Expected array of movies, got:", response.data);
        setMovies([]);
      }
    } catch (error) {
      console.error("Failed to fetch movies:", error);
      toast({ variant: "destructive", title: "Failed to fetch movies" });
    }
    setLoading(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, title: value });

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingTMDB(true);
      try {
        const response = await moviesApi.searchTMDB(value);
        setSuggestions(response.data.slice(0, 5));
      } catch (error) {
        console.error("TMDB search failed:", error);
      } finally {
        setIsSearchingTMDB(false);
      }
    }, 500);
  };

  const handleSuggestionSelect = async (movieId: string) => {
    setIsSearchingTMDB(true);
    setSuggestions([]); // Close dropdown
    try {
      const response = await moviesApi.getTMDBMovie(movieId);
      const tmdbMovie = response.data;

      setFormData({
        ...formData,
        tmdbId: tmdbMovie.id,
        title: tmdbMovie.title,
        description: tmdbMovie.description || "",
        poster: tmdbMovie.poster || "",
        banner: tmdbMovie.banner || "",
        language: languages.includes(tmdbMovie.language) ? tmdbMovie.language : "English", // Fallback
        duration: tmdbMovie.duration !== "TBA" ? tmdbMovie.duration : "",
        rating: tmdbMovie.rating || 0,
        releaseDate: tmdbMovie.releaseDate ? tmdbMovie.releaseDate.split("T")[0] : "",
        cast: tmdbMovie.cast?.map((c: any) => c.name).join(", ") || "",
        director: tmdbMovie.director || "",
      });

      // Filter valid genres
      const validGenres = tmdbMovie.genre.filter((g: string) => genreOptions.includes(g));
      setSelectedGenres(validGenres);

      toast({ title: "Details auto-filled from TMDB!" });
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
      toast({ variant: "destructive", title: "Failed to load movie details", description: error instanceof Error ? error.message : (error as any)?.response?.data?.error || String(error) });
    } finally {
      setIsSearchingTMDB(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const movieData = {
        ...formData,
        genre: selectedGenres,
        cast: formData.cast
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        rating: Number(formData.rating) || 0,
      };

      if (editingMovie) {
        await moviesApi.update(editingMovie.id, movieData);
        toast({ title: "Movie updated successfully" });
      } else {
        await moviesApi.create(movieData);
        toast({ title: "Movie created successfully" });
      }
      closeDialog();
      fetchMovies();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: editingMovie
          ? "Failed to update movie"
          : "Failed to create movie",
        description: error.response?.data?.error || "An error occurred",
      });
    }
  };

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setFormData({
      tmdbId: movie.tmdbId || "",
      title: movie.title,
      description: movie.description || "",
      poster: movie.poster || "",
      banner: movie.banner || "",
      language: movie.language || "Hindi",
      genre: movie.genre || [],
      duration: movie.duration || "",
      rating: movie.rating || 0,
      releaseDate: movie.releaseDate ? movie.releaseDate.split("T")[0] : "",
      certificate: movie.certificate || "UA",
      cast: movie.cast?.join(", ") || "",
      director: movie.director || "",
    });
    setSelectedGenres(movie.genre || []);
    setIsDialogOpen(true);
    setSuggestions([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this movie?")) return;
    try {
      await moviesApi.delete(id);
      toast({ title: "Movie deleted successfully" });
      fetchMovies();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete movie" });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMovie(null);
    setFormData(initialFormData);
    setSelectedGenres([]);
    setSuggestions([]);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Custom Movies">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="gradient-primary"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Movie
          </Button>
        </div>

        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Movie
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Language
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Genre
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Release Date
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredMovies.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <Film className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No custom movies added yet</p>
                    <p className="text-sm mt-1">
                      Click "Add Movie" to create your first custom movie
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovies.map((movie) => (
                  <motion.tr
                    key={movie.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-10 h-14 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded bg-muted flex items-center justify-center">
                            <Image className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{movie.title}</p>
                          {movie.duration && (
                            <p className="text-xs text-muted-foreground">
                              {movie.duration}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {movie.language}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {movie.genre?.slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            {g}
                          </span>
                        ))}
                        {(movie.genre?.length || 0) > 2 && (
                          <span className="px-2 py-0.5 bg-muted rounded text-xs">
                            +{movie.genre.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {movie.releaseDate
                        ? new Date(movie.releaseDate).toLocaleDateString()
                        : "TBA"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          movie.isActive
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {movie.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(movie)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(movie.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Movie Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMovie ? "Edit Movie" : "Add New Movie"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative">
                  <Label htmlFor="title">Title *</Label>
                  <div className="relative">
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={handleTitleChange}
                        required
                        placeholder="Start typing to search TMDB..."
                        autoComplete="off"
                      />
                      {isSearchingTMDB && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                      )}
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  <AnimatePresence>
                    {suggestions.length > 0 && !editingMovie && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
                        >
                            {suggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    className="p-3 hover:bg-muted cursor-pointer flex items-center gap-3 transition-colors"
                                    onClick={() => handleSuggestionSelect(suggestion.id)}
                                >
                                    {suggestion.poster ? (
                                        <img src={suggestion.poster} alt={suggestion.title} className="w-8 h-12 object-cover rounded" />
                                    ) : (
                                        <div className="w-8 h-12 bg-muted rounded flex items-center justify-center">
                                            <Film className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium">{suggestion.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {suggestion.releaseDate?.split('-')[0]} • {suggestion.language}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(v) =>
                      setFormData({ ...formData, language: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="certificate">Certificate</Label>
                  <Select
                    value={formData.certificate}
                    onValueChange={(v) =>
                      setFormData({ ...formData, certificate: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {certificates.map((cert) => (
                        <SelectItem key={cert} value={cert}>
                          {cert}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration (e.g., 2h 30m)</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    placeholder="2h 30m"
                  />
                </div>
                <div>
                  <Label htmlFor="releaseDate">Release Date</Label>
                  <Input
                    id="releaseDate"
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, releaseDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Rating (0-10)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rating: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="director">Director</Label>
                  <Input
                    id="director"
                    value={formData.director}
                    onChange={(e) =>
                      setFormData({ ...formData, director: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Genre (select multiple)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {genreOptions.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selectedGenres.includes(genre)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cast">Cast (comma separated)</Label>
                  <Input
                    id="cast"
                    value={formData.cast}
                    onChange={(e) =>
                      setFormData({ ...formData, cast: e.target.value })
                    }
                    placeholder="Actor 1, Actor 2, Actor 3"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="poster">Poster URL</Label>
                  <Input
                    id="poster"
                    value={formData.poster}
                    onChange={(e) =>
                      setFormData({ ...formData, poster: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="banner">Banner URL</Label>
                  <Input
                    id="banner"
                    value={formData.banner}
                    onChange={(e) =>
                      setFormData({ ...formData, banner: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary">
                  {editingMovie ? "Update Movie" : "Create Movie"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMovies;

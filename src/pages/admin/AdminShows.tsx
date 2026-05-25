import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Clock,
  Film,
  Eye,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showsApi, theatresApi, moviesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Show {
  id: string;
  movieId: string;
  movie?: { title: string };
  theatre: { id: string; name: string; city?: { name: string } };
  screen?: {
    name: string;
    seatLayout: {
      rows: number;
      cols: number;
      rowLabels: string[];
      types: Record<string, { label: string; price: number; rows: number[] }>;
      gapRows: number[];
      gapCols: number[];
      unavailableSeats: string[];
    };
  };
  showDate: string;
  showTime: string;
  prices: {
    Regular: number;
    Premium: number;
    VIP: number;
  };
  availableSeats: number;
  bookedSeatIds?: string[];
  isActive: boolean;
}

interface Theatre {
  id: string;
  name: string;
  city?: { name: string };
}

interface MovieOption {
  id: string;
  title: string;
}

const AdminShows = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [movieOptions, setMovieOptions] = useState<MovieOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [viewingShow, setViewingShow] = useState<Show | null>(null);
  
  const [formData, setFormData] = useState({
    movieId: "",
    movieType: "tmdb" as "tmdb" | "custom",
    theatre: "",
    showDate: "",
    showTime: "",
    priceRegular: 150,
    pricePremium: 250,
    priceVip: 400,
    availableSeats: 120,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchShows();
    fetchTheatres();
    fetchMovies();
  }, []);

  const fetchShows = async () => {
    try {
      const response = await showsApi.getAllAdmin();
      setShows(response.data);
    } catch (error) {
      console.error("Failed to fetch shows:", error);
    }
    setLoading(false);
  };

  const fetchTheatres = async () => {
    try {
      const response = await theatresApi.getAllAdmin();
      console.log("Fetched Theatres:", response.data);
      setTheatres(response.data);
    } catch (error) {
      console.error("Failed to fetch theatres:", error);
    }
  };

  const fetchMovies = async () => {
    try {
      // Only fetch movies from our database
      const response = await moviesApi.getCustom();
      
      const movies = response.data.map((m: any) => ({
        id: m.id,
        title: m.title,
      }));

      setMovieOptions(movies);
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShow) {
        await showsApi.update(editingShow.id, formData);
        toast({ title: "Show updated successfully" });
      } else {
        await showsApi.create(formData);
        toast({ title: "Show scheduled successfully" });
      }
      closeDialog();
      fetchShows();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: editingShow
          ? "Failed to update show"
          : "Failed to schedule show",
        description: error.response?.data?.error || "An error occurred",
      });
    }
  };

  const handleEdit = (show: Show) => {
    setEditingShow(show);
    setFormData({
      movieId: show.movieId,
      movieType: "custom", // Unused but kept for type compat if needed
      theatre: show.theatre?.id || "",
      showDate: show.showDate,
      showTime: show.showTime,
      priceRegular: show.prices?.Regular || 150,
      pricePremium: show.prices?.Premium || 250,
      priceVip: show.prices?.VIP || 400,
      availableSeats: show.availableSeats,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this show?")) return;
    try {
      await showsApi.delete(id);
      toast({ title: "Show deleted successfully" });
      fetchShows();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete show" });
    }
  };

  const handleToggleActive = async (show: Show) => {
    try {
      await showsApi.update(show.id, { isActive: !show.isActive });
      toast({ title: `Show ${show.isActive ? "deactivated" : "activated"}` });
      fetchShows();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update show" });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingShow(null);
    setFormData({
      movieId: "",
      movieType: "tmdb",
      theatre: "",
      showDate: "",
      showTime: "",
      priceRegular: 150,
      pricePremium: 250,
      priceVip: 400,
      availableSeats: 120,
    });
  };

  const handleMovieSelect = (value: string) => {
    // Value is just movieId now
    const movie = movieOptions.find((m) => m.id === value);
    if (movie) {
      setFormData({ ...formData, movieId: movie.id });
    }
  };

  const filteredShows = shows.filter(
    (show) =>
      show.movieId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      show.theatre?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCleanup = async () => {
    if (!confirm("Are you sure you want to delete all shows older than 7 days? This action cannot be undone.")) return;
    
    try {
      await showsApi.cleanup();
      toast({
        title: "Cleanup Successful",
        description: "Old shows have been removed.",
      });
      fetchShows();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: "Could not remove old shows.",
      });
    }
  };

  const handleSeed = async () => {
      setLoading(true);
      try {
          const res = await showsApi.seed();
          toast({
              title: "Schedule Generated",
              description: res.data.message || "Shows have been auto-scheduled.",
          });
          fetchShows();
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Scheduling Failed",
              description: error.response?.data?.error || "Failed to seed shows."
          });
      } finally {
          setLoading(false);
      }
  };

  const getMovieTitle = (show: Show) => {
    // Prefer the joined movie title from backend
    if (show.movie?.title) return show.movie.title;
    
    // Fallback to options lookup (mostly for newly created items if list isn't refreshed properly)
    const movie = movieOptions.find((m) => m.id === show.movieId);
    return movie?.title || show.movieId;
  };

  // Helper to render seat map
  const renderSeatMap = (show: Show) => {
    if (!show.screen || !show.screen.seatLayout) {
        return <div className="p-8 text-center text-muted-foreground">No seat layout available</div>;
    }
    
    const { seatLayout } = show.screen;
    const { rows, cols, rowLabels, gapCols } = seatLayout;
    
    // Only generate seats if we have layout
    const grid = [];
    
    for (let r = 0; r < rows; r++) {
      const rowSeats = [];
      for (let c = 0; c < cols; c++) {
        // Gap column logic
        if (gapCols && gapCols.includes(c)) {
          rowSeats.push(<div key={`gap-${r}-${c}`} className="w-6" />);
        }

        const seatId = `${rowLabels[r]}${c + 1}`;
        const isBooked = show.bookedSeatIds?.includes(seatId);
        
        rowSeats.push(
          <div
            key={seatId}
            className={cn(
               "w-6 h-6 rounded-t-md text-[8px] flex items-center justify-center border",
               isBooked 
                ? "bg-red-500/20 border-red-500 text-red-500" 
                : "bg-green-500/20 border-green-500 text-green-500"
            )}
            title={seatId}
          >
            {c + 1}
          </div>
        );
      }
      grid.push(
        <div key={`row-${r}`} className="flex items-center justify-center gap-1 mb-1">
             <div className="w-6 text-xs text-muted-foreground font-medium text-right mr-2">{rowLabels[r]}</div>
             {rowSeats}
        </div>
      );
    }
    
    return (
        <div className="bg-black/20 p-6 rounded-lg overflow-x-auto">
            <div className="w-full min-w-max">
                 {/* Screen */}
                 <div className="w-3/4 h-1 mx-auto bg-primary/50 mb-8 shadow-[0_10px_30px_-5px_var(--primary)] text-center text-[10px] text-primary pt-2">SCREEN</div>
                 {grid}
                 
                 {/* Legend */}
                 <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                           <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500" />
                           Available
                      </div>
                      <div className="flex items-center gap-2">
                           <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500" />
                           Booked
                      </div>
                 </div>
            </div>
        </div>
    );
  };

  return (
    <AdminLayout title="Shows Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shows..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="gradient-primary"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Schedule Show
          </Button>
        </div>
        
        <div className="flex justify-end">
           <Button variant="destructive" size="sm" onClick={handleCleanup} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Cleanup Old Shows (&gt;7 days)
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
                  Theatre
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Date & Time
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Prices (₹)
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Seats
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
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredShows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No shows scheduled yet</p>
                    <p className="text-sm mt-1">
                      Click "Schedule Show" to create your first show
                    </p>
                  </td>
                </tr>
              ) : (
                filteredShows.map((show) => (
                  <motion.tr
                    key={show.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{getMovieTitle(show)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p>{show.theatre?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {show.theatre?.city?.name}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p>{new Date(show.showDate).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {show.showTime}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <p>Regular: ₹{show.prices?.Regular || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        Premium: ₹{show.prices?.Premium || 0} | VIP: ₹{show.prices?.VIP || 0}
                      </p>
                    </td>
                    <td className="p-4">
                      <p>
                        {show.availableSeats - (show.bookedSeatIds?.length || 0)}{" "}
                        / {show.availableSeats}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {show.bookedSeatIds?.length || 0} booked
                      </p>
                    </td>
                    <td className="p-4">
                      <Switch
                        checked={show.isActive}
                        onCheckedChange={() => handleToggleActive(show)}
                      />
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingShow(show)}
                                title="View Seat Map"
                            >
                                <Eye className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(show)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(show.id)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                       </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Show Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingShow ? "Edit Show" : "Schedule New Show"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Movie *</Label>
                  <Select
                  value={formData.movieId}
                  onValueChange={handleMovieSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a movie" />
                  </SelectTrigger>
                  <SelectContent>
                    {movieOptions.map((movie) => (
                      <SelectItem key={movie.id} value={movie.id}>
                        {movie.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Theatre *</Label>
                <Select
                  value={formData.theatre}
                  onValueChange={(v) =>
                    setFormData({ ...formData, theatre: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theatre" />
                  </SelectTrigger>
                  <SelectContent>
                    {theatres.map((theatre) => (
                      <SelectItem key={theatre.id} value={theatre.id}>
                        {theatre.name}{" "}
                        {theatre.city?.name ? `(${theatre.city.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="showDate">Date *</Label>
                  <Input
                    id="showDate"
                    type="date"
                    value={formData.showDate}
                    onChange={(e) =>
                      setFormData({ ...formData, showDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="showTime">Time *</Label>
                  <Input
                    id="showTime"
                    type="time"
                    value={formData.showTime}
                    onChange={(e) =>
                      setFormData({ ...formData, showTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priceRegular">Regular (₹)</Label>
                  <Input
                    id="priceRegular"
                    type="number"
                    min="0"
                    value={formData.priceRegular}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceRegular: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pricePremium">Premium (₹)</Label>
                  <Input
                    id="pricePremium"
                    type="number"
                    min="0"
                    value={formData.pricePremium}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricePremium: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="priceVip">VIP (₹)</Label>
                  <Input
                    id="priceVip"
                    type="number"
                    min="0"
                    value={formData.priceVip}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceVip: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="availableSeats">Total Seats</Label>
                <Input
                  id="availableSeats"
                  type="number"
                  min="1"
                  value={formData.availableSeats}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      availableSeats: parseInt(e.target.value) || 120,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary">
                  {editingShow ? "Update Show" : "Schedule Show"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Seats Dialog */}
        <Dialog open={!!viewingShow} onOpenChange={(open) => !open && setViewingShow(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                 <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                           Seat Map: {viewingShow && getMovieTitle(viewingShow)}
                      </DialogTitle>
                      <DialogDescription>
                           {viewingShow?.theatre?.name} • {viewingShow && new Date(viewingShow.showDate).toLocaleDateString()} • {viewingShow?.showTime}
                           <br/>
                           <span className="font-semibold text-foreground mt-2 inline-block">
                                Booked: {viewingShow?.bookedSeatIds?.length || 0} / {viewingShow?.availableSeats} seats
                           </span>
                      </DialogDescription>
                 </DialogHeader>
                 
                 <div className="mt-4">
                      {viewingShow && renderSeatMap(viewingShow)}
                 </div>
                 
                 <div className="flex justify-end mt-4">
                      <Button onClick={() => setViewingShow(null)}>Close</Button>
                 </div>
            </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
};

export default AdminShows;

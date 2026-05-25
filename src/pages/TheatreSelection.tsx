import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Seat } from "@/data/mockData";
import { useTMDBMovieDetails } from "@/hooks/useTMDBMovies";
import { showsApi } from "@/lib/api";
import { useCity } from "@/contexts/CityContext";
import {
  MapPin,
  ArrowLeft,
  Calendar,
  Clock,
  AlertCircle,
  Film,
} from "lucide-react";

interface DBShow {
  id: string;
  movieId: string;
  theatre: {
    id: string;
    name: string;
    address: string;
    city: { id: string; name: string };
  };
  showDate: string;
  showTime: string;
  prices?: Record<string, number>;
  priceRegular?: number;
  pricePremium?: number;
  priceVip?: number;
  availableSeats: number;
  bookedSeats: string[];
  screen: any;
}

interface TheatreWithShows {
  id: string;
  name: string;
  location: string;
  shows: Array<{
    id: string;
    time: string;
    showTime: string;
    showDate: string;
    prices?: Record<string, number>;
    price: number;
    priceRegular?: number;
    pricePremium?: number;
    priceVip?: number;
    availableSeats: number;
    bookedSeats: string[];
    screen: any; // Include screen details
  }>;
}

const TheatreSelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCity } = useCity();
  const { data: movie, isLoading, error } = useTMDBMovieDetails(id);
  const [selectedShow, setSelectedShow] = useState<{
    theatre: TheatreWithShows;
    show: TheatreWithShows["shows"][0];
  } | null>(null);
  const [dbShows, setDbShows] = useState<DBShow[]>([]);
  const [loadingShows, setLoadingShows] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Calculate start date and release date info based on movie release date
  const { startDate, releaseDate, isUpcoming } = useMemo(() => {
    if (!movie?.releaseDate) {
      return { startDate: today, releaseDate: null, isUpcoming: false };
    }

    const relDate = new Date(movie.releaseDate);
    relDate.setHours(0, 0, 0, 0);

    // If movie is not yet released, booking starts from release date
    // If movie is already released, booking starts from today
    const isMovieUpcoming = relDate > today;
    return {
      startDate: isMovieUpcoming ? relDate : today,
      releaseDate: relDate,
      isUpcoming: isMovieUpcoming,
    };
  }, [movie?.releaseDate, today]);

  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });
  }, [startDate]);

  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);

  // Update selected date when dates change (movie loads)
  useEffect(() => {
    setSelectedDate(dates[0]);
  }, [dates]);

  // Fetch real shows from database
  useEffect(() => {
    const fetchShows = async () => {
      if (!id || !selectedDate) return;

      setLoadingShows(true);
      try {
        const offset = selectedDate.getTimezoneOffset();
        const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
        const dateStr = localDate.toISOString().split("T")[0];
        console.log(`[TheatreSelection] Fetching shows: movieId=${id}, date=${dateStr}, cityId=${selectedCity?.id}`);
        
        const response = await showsApi.getByMovie(
          id,
          dateStr,
          selectedCity?.id
        );
        const shows = response.data;
        console.log("DB Shows Response Data:", shows);
        setDbShows(shows || []);
      } catch (err) {
        console.error("Failed to fetch shows:", err);
        setDbShows([]);
      } finally {
        setLoadingShows(false);
      }
    };

    fetchShows();
  }, [id, selectedDate, selectedCity?.id]);

  // Group shows by theatre
  const theatresWithShows = useMemo((): TheatreWithShows[] => {
    // Group DB shows by theatre
    const theatreMap = new Map<string, TheatreWithShows>();

    dbShows.forEach((show) => {
      const theatreId = show.theatre.id;
      if (!theatreMap.has(theatreId)) {
        theatreMap.set(theatreId, {
          id: theatreId,
          name: show.theatre.name,
          location: show.theatre.address || "",
          shows: [],
        });
      }

      const theatre = theatreMap.get(theatreId)!;
      theatre.shows.push({
        id: show.id,
        time: show.showTime,
        showTime: show.showTime,
        showDate: show.showDate,
        prices: show.prices,
        price: show.prices?.Regular || show.priceRegular || 0,
        priceRegular: show.prices?.Regular || show.priceRegular,
        pricePremium: show.prices?.Premium || show.pricePremium,
        priceVip: show.prices?.VIP || show.priceVip,
        availableSeats: show.availableSeats,
        bookedSeats: show.bookedSeats || [],
        screen: show.screen, // Pass screen details
      });
    });

    // Sort shows by time within each theatre
    theatreMap.forEach((theatre) => {
      theatre.shows.sort((a, b) => a.showTime.localeCompare(b.showTime));
    });

    return Array.from(theatreMap.values());
  }, [dbShows]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="border-b border-border bg-card/50">
          <div className="container py-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-24 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">
            Movie Not Found
          </h1>
          <Link to="/">
            <Button variant="primary">Go Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleShowSelect = (
    theatre: TheatreWithShows,
    show: TheatreWithShows["shows"][0]
  ) => {
    setSelectedShow({ theatre, show });
  };

  const handleProceed = () => {
    if (selectedShow) {
      navigate(`/movie/${id}/seats`, {
        state: {
          movie,
          theatre: selectedShow.theatre,
          show: selectedShow.show,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Movie Mini Banner */}
      <section className="border-b border-border bg-card/50">
        <div className="container py-6">
          <Link
            to={`/movie/${id}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to movie</span>
          </Link>

          <div className="flex items-center gap-4">
            {movie.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-16 h-24 rounded-lg object-cover shadow-lg"
              />
            ) : (
              <div className="w-16 h-24 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No Poster</span>
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl md:text-3xl tracking-wide text-foreground">
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{movie.language}</span>
                <span>•</span>
                <span>{movie.duration}</span>
                <span>•</span>
                <span>{movie.genre.join(", ")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Date Selector */}
      <section className="border-b border-border sticky top-16 z-40 bg-background/95 backdrop-blur">
        <div className="container py-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Select Date
            </span>
            {isUpcoming && (
              <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                Advance Booking
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dates.map((date, index) => {
              const isSelected =
                date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === today.toDateString();
              const isReleaseDay =
                isUpcoming &&
                releaseDate &&
                date.toDateString() === releaseDate.toDateString();

              // Determine the label for the date
              const getDateLabel = () => {
                if (isReleaseDay) return "Release";
                if (isToday) return "Today";
                return date.toLocaleDateString("en-US", { weekday: "short" });
              };

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`shrink-0 flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : isReleaseDay
                      ? "bg-warning/20 text-warning border border-warning/50 hover:bg-warning/30"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  <span className="text-xs font-medium uppercase">
                    {getDateLabel()}
                  </span>
                  <span className="text-lg font-bold">{date.getDate()}</span>
                  <span className="text-xs">
                    {date.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Loading Shows */}
      {loadingShows && (
        <section className="container py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </section>
      )}

      {/* Theatre List */}
      {!loadingShows && (
        <section className="container py-8">
          <div className="space-y-6">
            {theatresWithShows.length === 0 ? (
              <div className="text-center py-16">
                <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-display text-foreground mb-2">
                  No Shows Available
                </h3>
                <p className="text-muted-foreground mb-4">
                  There are no shows scheduled for this movie on the selected
                  date.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try selecting a different date or check back later.
                </p>
              </div>
            ) : (
              theatresWithShows.map((theatre, index) => (
                <div
                  key={theatre.id}
                  className="rounded-xl border border-border bg-card p-6 animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Theatre Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-display text-xl text-foreground mb-1">
                        {theatre.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{theatre.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-seat-available" />
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span>Selected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-seat-booked" />
                        <span>Filling Fast</span>
                      </div>
                    </div>
                  </div>

                  {/* Show Timings */}
                  <div className="flex flex-wrap gap-3">
                    {theatre.shows.map((show) => {
                      const isSelected =
                        selectedShow?.theatre.id === theatre.id &&
                        selectedShow?.show.id === show.id;
                      const isFillingFast = show.availableSeats < 30;

                      return (
                        <button
                          key={show.id}
                          onClick={() => handleShowSelect(theatre, show)}
                          className={`group relative px-6 py-3 rounded-lg border transition-all duration-300 ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                              : isFillingFast
                              ? "border-warning/50 hover:border-primary hover:bg-primary/10"
                              : "border-border hover:border-primary hover:bg-primary/10"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`font-semibold ${
                                isSelected ? "" : "text-foreground"
                              }`}
                            >
                              {show.time}
                            </span>
                            <span
                              className={`text-xs ${
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              ₹{show.price}
                            </span>
                          </div>
                          {isFillingFast && !isSelected && (
                            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-warning text-warning-foreground text-[10px] font-medium">
                              Filling Fast
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      {selectedShow && (
        <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur p-4 animate-fade-up">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-foreground font-medium">
                  {selectedShow.show.time}
                </span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  {selectedShow.theatre.name}
                </span>
              </div>
            </div>
            <Button variant="primary" size="lg" onClick={handleProceed}>
              Select Seats
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheatreSelection;

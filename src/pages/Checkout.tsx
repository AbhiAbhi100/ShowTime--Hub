import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBooking } from "@/hooks/useBooking";
import { showsApi } from "@/lib/api";
import { Movie, Theatre, Show, Seat } from "@/types";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Ticket,
  CreditCard,
  Shield,
} from "lucide-react";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Cast state
  const state = location.state || {};
  const movie = state.movie as Movie;
  const theatre = state.theatre as Theatre;
  const show = state.show as Show;
  const seats = state.seats as Seat[];
  const totalAmount = state.totalAmount as number;

  // Refs for cleanup (avoiding effect dependencies)
  const showRef = useRef(show);
  const seatsRef = useRef(seats);
  
  // Update refs when data changes (though it shouldn't really change on this page)
  useEffect(() => {
    showRef.current = show;
    seatsRef.current = seats;
  }, [show, seats]);

  const { user, loading } = useAuth();
  const { createBooking } = useBooking();
  // Track if booking was successful to prevent unlocking on unmount
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const successRef = useRef(false); // To track success in cleanup effect
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", {
        state: { returnTo: "/checkout", bookingData: location.state },
      });
    }
  }, [user, loading, navigate, location.state]);

  // Unlock seats on unmount if not successful
  // We use a ref to store the timeout ID so we can cancel it if component remounts (Strict Mode)
  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If we have a pending unlock from a previous unmount (Strict Mode flick), cancel it!
    // This part runs on MOUNT.
    const activeTimeout = window.sessionStorage.getItem(`unlock_timeout_${show?.id}`);
    if (activeTimeout) {
        clearTimeout(parseInt(activeTimeout));
        window.sessionStorage.removeItem(`unlock_timeout_${show?.id}`);
    }

    return () => {
        // This runs on UNMOUNT.
        // Use refs to get latest data without re-triggering effect on data change
        const currentShow = showRef.current;
        const currentSeats = seatsRef.current;
        
        if (!successRef.current && currentShow && currentSeats) {
             const timeoutId = setTimeout(() => {
                showsApi.unlock(currentShow.id, currentSeats.map(s => s.id)).catch(err => 
                    console.error("Failed to unlock seats on exit:", err)
                );
                window.sessionStorage.removeItem(`unlock_timeout_${currentShow.id}`);
             }, 1000); 

             window.sessionStorage.setItem(`unlock_timeout_${currentShow.id}`, timeoutId.toString());
        }
    };
  }, []); // Empty dependency array: Only runs on Mount/Unmount

  if (!movie || !theatre || !show || !seats) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">
            Session Expired
          </h1>
          <Link to="/">
            <Button variant="primary">Go Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const convenienceFee = Math.round(totalAmount * 0.1);
  const grandTotal = totalAmount + convenienceFee;

  const handlePayment = async () => {
    try {
      const showId = show.id;
      // Ensure movieId is a string (TMDB returns numbers)
      const movieId = String(movie.id);

      // Simple unique key for this attempt (UUID v4 or random string)
      // If user retries *intentionally*, they might want a new key.
      // But for network retries of the *same* button click, we want same key?
      // Actually, usually we generate one key per "Intent".
      // Let's generate one key when component mounts or when payment starts, 
      // but if payment fails and user stays on page to retry, maybe same key?
      // Standard practice: One key per "transaction attempt".
      // Let's generate a key now.
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const bookingId = await createBooking({
        movieId: movieId,
        movieTitle: movie.title,
        // Use posterUrl if available (backend), else poster (frontend legacy)
        moviePoster: movie.posterUrl || movie.poster,
        theatreName: theatre.name,
        theatreLocation: theatre.address,
        showTime: show.showTime,
        showDate: show.showDate,
        seats: seats.map((s) => s.id),
        totalAmount: grandTotal,
        showId: showId,
      }, idempotencyKey);

      if (bookingId) {
        successRef.current = true;
        setBookingSuccess(true);
        navigate("/success", {
          state: {
            movie,
            theatre,
            show,
            seats,
            totalAmount: grandTotal,
            bookingId,
          },
        });
      } else {
        // Fallback if toast was missed
        alert("Booking failed. Please check the console or try again.");
      }
    } catch (err) {
      console.error("Payment Handler Error:", err);
      alert("An unexpected error occurred during payment.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container py-8">
        <Link
          to={`/movie/${movie.id}/seats`}
          state={{ movie, theatre, show }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to seats</span>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 animate-fade-up">
              <h2 className="font-display text-2xl text-foreground mb-6">
                Booking Summary
              </h2>

              {/* Movie Details */}
              <div className="flex gap-4 pb-6 border-b border-border">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-24 h-36 rounded-lg object-cover shadow-lg"
                />
                <div className="flex-1 space-y-3">
                  <h3 className="font-display text-xl text-foreground">
                    {movie.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.genre.map((g: string) => (
                      <span
                        key={g}
                        className="px-2 py-1 rounded bg-secondary text-xs text-muted-foreground"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>{movie.language}</span>
                    <span>•</span>
                    <span>{movie.duration}</span>
                  </div>
                </div>
              </div>

              {/* Show Details */}
              <div className="grid sm:grid-cols-2 gap-4 py-6 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Theatre</p>
                    <p className="font-medium text-foreground">
                      {theatre.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {theatre.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Show Time</p>
                    <p className="font-medium text-foreground">
                      {show.showTime}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {show.showDate
                        ? new Date(show.showDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })
                        : new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seats */}
              <div className="py-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Seats ({seats.length})
                    </p>
                    <p className="font-medium text-foreground">
                      {seats.map((s) => s.id).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div
              className="rounded-xl border border-border bg-card p-6 animate-fade-up"
              style={{ animationDelay: "100ms" }}
            >
              <h2 className="font-display text-2xl text-foreground mb-6">
                Payment Method
              </h2>

              <div className="space-y-3">
                {[
                  {
                    id: "card",
                    label: "Credit / Debit Card",
                    icon: CreditCard,
                  },
                  {
                    id: "upi",
                    label: "UPI Payment",
                    icon: () => <span className="text-lg">📱</span>,
                  },
                  {
                    id: "wallet",
                    label: "Digital Wallet",
                    icon: () => <span className="text-lg">💳</span>,
                  },
                ].map((method) => (
                  <label
                    key={method.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/30 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="payment"
                      defaultChecked={method.id === "card"}
                      className="w-5 h-5 accent-primary"
                    />
                    <method.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">
                      {method.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-6 p-4 rounded-lg bg-success/10 border border-success/20">
                <Shield className="h-5 w-5 text-success" />
                <p className="text-sm text-success">
                  Your payment is secured with 256-bit encryption
                </p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="lg:col-span-1">
            <div
              className="sticky top-24 rounded-xl border border-border bg-card p-6 animate-fade-up"
              style={{ animationDelay: "150ms" }}
            >
              <h3 className="font-display text-xl text-foreground mb-6">
                Price Details
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tickets ({seats.length} × ₹
                    {Math.round(totalAmount / seats.length)})
                  </span>
                  <span className="text-foreground">
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Convenience Fee</span>
                  <span className="text-foreground">
                    ₹{convenienceFee.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">
                    Total Amount
                  </span>
                  <span className="font-display text-2xl text-foreground">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="xl"
                className="w-full mt-6"
                onClick={handlePayment}
              >
                Pay ₹{grandTotal.toLocaleString()}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By proceeding, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Checkout;

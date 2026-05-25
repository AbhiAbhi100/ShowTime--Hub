import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Monitor, Info, Loader2 } from "lucide-react";
import { showsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Show, Screen, Theatre, Movie, Seat, SeatLayoutType } from "@/types";

import { useAuth } from "@/contexts/AuthContext";

const SeatSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Cast types from navigation state
  const movie = location.state?.movie as Movie;
  const theatre = location.state?.theatre as Theatre;
  const show = location.state?.show as Show;
  
  console.log("SeatSelection Show Prop:", show);
  
  const { toast } = useToast();

  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]); // New state for locked seats
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [proceeding, setProceeding] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>(show?.prices || {});

  // Helper: Get seat layout from show
  const seatLayout = useMemo(() => {
    if (!show || !show.screen) return null;
    // Handle both populated object and ID string cases
    if (typeof show.screen === 'string') {
        // If screen is just an ID, we can't render layout.
        // Ideally show should be populated.
        console.error("SeatSelection: show.screen is partial/string", show.screen);
        return null;
    }
    return (show.screen as Screen).seatLayout;
  }, [show]);

  // Generate dynamic seat layout
  const seats = useMemo(() => {
    if (!seatLayout) return [];

    const generatedSeats: Seat[] = [];
    const { rows, cols, rowLabels = [], types = {}, unavailableSeats } = seatLayout;
    
    const getSeatType = (rowIndex: number): { name: string; price: number } => {
      const targetRow = rowIndex + 1;
      const entries = types ? Object.entries(types) : [];
      
      // If the theatre has explicit seat layout types defined, use them
      if (entries.length > 0) {
        for (const [key, typeConfig] of entries) {
          if ((typeConfig as SeatLayoutType).rows.includes(targetRow)) {
             const typeLabel = (typeConfig as SeatLayoutType).label || key;
             const showPrice = livePrices ? livePrices[typeLabel] : 0;
             return { name: typeLabel, price: showPrice || (typeConfig as SeatLayoutType).price || 200 };
          }
        }
      }

      // If no layout types are set on the theatre, dynamically distribute the livePrices
      // Example: 10 rows total. Bottom rows (A-C) = Regular, Middle (D-G) = Premium, Top (H-J) = VIP
      if (livePrices && Object.keys(livePrices).length > 0) {
        // Standardize the tiers if they exist (VIP > Premium > Regular)
        const hasVip = "VIP" in livePrices;
        const hasPremium = "Premium" in livePrices;
        const hasRegular = "Regular" in livePrices;

        // Front to back (Row index 0 is front)
        if (hasVip && rowIndex >= rows - Math.ceil(rows * 0.2)) {
            return { name: "VIP", price: livePrices["VIP"] };
        }
        if (hasPremium && rowIndex >= rows - Math.ceil(rows * 0.5)) {
            return { name: "Premium", price: livePrices["Premium"] };
        }
        if (hasRegular) {
            return { name: "Regular", price: livePrices["Regular"] };
        }
        
        // Fallback to whatever the first price is
        const firstKey = Object.keys(livePrices)[0];
        return { name: firstKey, price: livePrices[firstKey] };
      }

      return { name: "Standard", price: 200 }; // Ultimate Fallback
    };

    // Iterate rows
    for (let r = 0; r < rows; r++) {
      const rowLabel = rowLabels[r] || String.fromCharCode(65 + r); // A, B, C... fallback
      const { name: typeName, price } = getSeatType(r);

      for (let c = 0; c < cols; c++) {
        const seatNum = c + 1;
        const seatId = `${rowLabel}${seatNum}`; // "A1"
        
        // Check if fundamentally unavailable (physically missing or blocked)
        const isUnavailable = unavailableSeats?.includes(seatId);

        if (!isUnavailable) {
            generatedSeats.push({
              id: seatId,
              row: rowLabel,
              number: seatNum,
              status: bookedSeats.includes(seatId) ? "booked" : "available",
              price: price,
              type: typeName
            });
        }
      }
    }

    return generatedSeats;
  }, [seatLayout, bookedSeats, show, livePrices]);

  // Fetch booked seats from the server
  useEffect(() => {
    const fetchBookedSeats = async () => {
      if(!show?.id) return;

      try {
        const response = await showsApi.get(show.id);
        const showData = response.data;
        // Backend now returns bookedSeatIds AND lockedSeatIds
        setBookedSeats(showData.bookedSeatIds || showData.bookedSeats || []);
        setLockedSeats(showData.lockedSeatIds || []);
        if (showData.prices && Object.keys(showData.prices).length > 0) {
            setLivePrices(showData.prices);
        }
      } catch (error) {
        console.error("Failed to fetch booked seats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookedSeats();

    // Auto-refresh booked seats every 10 seconds
    const intervalId = setInterval(fetchBookedSeats, 10000);

    return () => clearInterval(intervalId);
  }, [show?.id]);

  // Clear selected seats that became booked
  useEffect(() => {
    if (bookedSeats.length > 0 && selectedSeats.length > 0) {
      const conflictingSeats = selectedSeats.filter((s) =>
        bookedSeats.includes(s.id)
      );
      if (conflictingSeats.length > 0) {
        setSelectedSeats((prev) =>
          prev.filter((s) => !bookedSeats.includes(s.id))
        );
      }
    }
  }, [bookedSeats, selectedSeats]);

  const rows = useMemo(() => {
    if(!seats.length) return [];
    
  // First compute grouped by row as before
  const groupedByRow: Record<string, Seat[]> = {};
  seats.forEach((seat) => {
    if (!groupedByRow[seat.row]) groupedByRow[seat.row] = [];
    groupedByRow[seat.row].push(seat);
  });

  // Calculate the sorted row tuples
  const rowsTuple = seatLayout?.rowLabels
    ? seatLayout.rowLabels.filter((label) => groupedByRow[label] && groupedByRow[label].length > 0).map((label) => [label, groupedByRow[label]] as [string, Seat[]])
    : Object.entries(groupedByRow).sort(([a], [b]) => a.localeCompare(b));

  // Now group those rows by category
  const categories: { name: string; price: number; rows: [string, Seat[]][] }[] = [];
  rowsTuple.forEach(([rowLabel, rowSeats]) => {
    // Determine the category of this row based on its first valid seat
    const firstSeat = rowSeats.find((s) => s.type);
    if (!firstSeat) return;

    const { type, price } = firstSeat;
    let category = categories.find((c) => c.name === type);

    if (!category) {
      category = { name: type, price, rows: [] };
      categories.push(category);
    }

    category.rows.push([rowLabel, rowSeats]);
  });

  // Sort categories by price ascending (lowest price at front/screen, highest price at back/bottom)
  return categories.sort((a, b) => a.price - b.price);
  }, [seats, seatLayout]);

  const totalAmount = useMemo(() => {
    return selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  }, [selectedSeats]);

  if (!movie || !theatre || !show || !seatLayout) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">
             {!seatLayout ? "Layout Not Found" : "Session Expired"}
          </h1>
          <p className="mb-4 text-muted-foreground">
             {!seatLayout ? "This screen configuration is missing." : "Please restart your booking."}
          </p>
          <Link to="/">
            <Button variant="primary">Go Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === "booked" || bookedSeats.includes(seat.id) || lockedSeats.includes(seat.id)) return;

    setSelectedSeats((prev) => {
      const isSelected = prev.some((s) => s.id === seat.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== seat.id);
      } else if (prev.length < 10) {
        return [...prev, seat];
      }
      return prev;
    });
  };

  const { user } = useAuth(); // Add this hook at top level

  const handleProceed = async () => {
    if (selectedSeats.length === 0) return;

    if (!user) {
        toast({
            title: "Sign In Required",
            description: "Please sign in to proceed with booking.",
            action: <Button variant="outline" size="sm" onClick={() => navigate("/auth", { state: { returnTo: location.pathname, bookingData: { movie, theatre, show } } })}>Sign In</Button>
        });
        // Optional: Auto redirect after delay or just let them click
        return;
    }

    setProceeding(true);

    try {
      // Final check
      // 1. Lock seats on backend
      await showsApi.lock(show.id, selectedSeats.map(s => s.id));

      navigate("/checkout", {
        state: { movie, theatre, show, seats: selectedSeats, totalAmount },
      });
    } catch (error: any) {
      console.error("Failed to verify/lock seats:", error);
      
      // If lock failed, refresh data and show error
      if (error.response?.status === 409) {
          const conflicts = error.response.data.conflicts || [];
          setBookedSeats(prev => [...prev, ...conflicts]); // Mark as booked/unavailable locally
          setSelectedSeats(prev => prev.filter(s => !conflicts.includes(s.id)));
          
          toast({
            variant: "destructive",
            title: "Seats Unavailable",
            description: error.response.data.error || "Some seats are already taken.",
          });
      } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to reserve seats. Please try again.",
          });
      }
    } finally {
      setProceeding(false);
    }
  };

  const getSeatStatus = (seat: Seat): "available" | "selected" | "booked" => {
    if (seat.status === "booked" || bookedSeats.includes(seat.id) || lockedSeats.includes(seat.id))
      return "booked";
    return selectedSeats.some((s) => s.id === seat.id)
      ? "selected"
      : "available";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading seat availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />

      {/* Movie Info Bar */}
      <section className="border-b border-border bg-card/50">
        <div className="container py-4">
          <Link
            to={`/movie/${movie.id}/theatres`} // Use id
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to theatres</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl md:text-2xl text-foreground">
                {movie.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {theatre.name} • {show.showTime} {/* Use showTime */}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <div className="w-5 h-6 rounded-t-lg rounded-b-sm bg-seat-available shadow-[0_3px_0_0_#166534] relative">
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 rounded-b-sm" />
                </div>
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-6 rounded-t-lg rounded-b-sm bg-seat-selected shadow-[0_3px_0_0_#991b1b] relative">
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 rounded-b-sm" />
                </div>
                <span className="text-muted-foreground">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-6 rounded-t-lg rounded-b-sm bg-seat-booked opacity-50 shadow-[0_3px_0_0_#1f2937] relative">
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 rounded-b-sm" />
                </div>
                <span className="text-muted-foreground">Booked</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seat Grid */}
      <section className="container py-8">
        <div className="relative mb-16 mt-4">
          <div className="flex flex-col items-center justify-center text-muted-foreground mb-6">
            <span className="text-xs font-bold tracking-[0.3em] uppercase mb-1 text-primary/80">Screen This Way</span>
            <span className="text-[10px] text-muted-foreground/50">{ (show.screen as Screen).name }</span>
          </div>
          <div className="relative mx-auto max-w-2xl px-4">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent blur-2xl" />
            <div className="h-1.5 w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-[100%] shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
            <div className="h-12 w-full bg-gradient-to-b from-primary/20 to-transparent rounded-b-[100%] opacity-40 mx-auto" />
          </div>
        </div>

        {/* Dynamic Price Legend */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
          {Object.entries(show.prices || {}).map(([type, price]) => (
             <div key={type} className="flex items-center gap-2">
                <div className="px-3 py-1 rounded bg-secondary text-foreground font-semibold border border-white/10">
                   ₹{price}
                </div>
                <span className="text-muted-foreground">{type}</span>
             </div>
          ))}
        </div>

        {/* Seats */}
        <div className="max-w-4xl mx-auto space-y-3 overflow-x-auto pb-4">
          <div className="min-w-fit mx-auto px-4">
            {rows.map((category) => (
              <div key={category.name} className="mb-8 last:mb-0">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px bg-border flex-1 max-w-[100px]" />
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                      {category.name} - ₹{category.price}
                    </span>
                  </div>
                  <div className="h-px bg-border flex-1 max-w-[100px]" />
                </div>

                <div className="space-y-3">
                  {category.rows.map(([row, rowSeats]) => (
                    <div key={row} className="flex items-center gap-3 justify-center">
                    <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
                        {row}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Render seats with support for gaps */}
                        {/* Since rowSeats only contains valid seats, we can just map them. 
                            If we need accurate gap rendering, we'd iterate 1..cols and find/render seat/gap.
                            Let's try 1..cols approach for better grid. */}
                        {Array.from({ length: seatLayout.cols }).map((_, colIndex) => {
                            const seatNum = colIndex + 1;
                            // Check if seat exists in rowSeats (it might be unavailable or filtered)
                            const seat = rowSeats.find(s => s.number === seatNum);
                            
                            // Check for Gaps
                            const isGap = seatLayout.gapCols?.includes(seatNum);
                            
                            // If it's a gap column, render gap space
                            if (isGap) {
                                return <div key={`gap-${colIndex}`} className="w-8" />;
                            }

                            if (!seat) {
                                // Unavailable or just missing from logic? 
                                // If missing but not a gap, render placeholder or invisible
                                return <div key={`empty-${colIndex}`} className="w-8 h-8 opacity-0" />;
                            }

                            const status = getSeatStatus(seat);
                            return (
                                <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat)}
                                disabled={status === "booked"}
                                title={`${seat.id} - ${seat.type} - ₹${seat.price}`} // Tooltip
                                className={`relative w-8 h-9 rounded-t-xl rounded-b-md text-[11px] font-bold transition-all duration-200 flex items-center justify-center group
                                    ${status === "available"
                                    ? "bg-seat-available hover:bg-green-500 shadow-[0_4px_0_0_#166534] hover:shadow-[0_2px_0_0_#166534] hover:translate-y-[2px] text-white"
                                    : status === "selected"
                                    ? "bg-seat-selected shadow-[0_2px_0_0_#991b1b] translate-y-[2px] text-white"
                                    : "bg-seat-booked opacity-50 shadow-[0_4px_0_0_#1f2937] text-white/40 cursor-not-allowed"
                                    }`}
                                >
                                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/20 rounded-b-md" />
                                  <div className="absolute top-0 inset-x-1 h-1/2 bg-white/10 rounded-t-xl" />
                                  <span className="relative z-10">{seat.number}</span>
                                </button>
                            );
                        })}
                    </div>
                    <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
                        {row}
                    </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 max-w-xl mx-auto mt-8 p-4 rounded-lg bg-secondary/50 border border-border">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            You can select up to 10 seats at a time.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur p-4 animate-fade-up">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <div>
                <span className="text-sm text-muted-foreground">
                  Selected Seats:{" "}
                </span>
                <span className="font-semibold text-foreground">
                  {selectedSeats.map((s) => s.id).join(", ")}
                </span>
              </div>
              <div className="text-2xl font-display text-foreground">
                ₹{totalAmount.toLocaleString()}
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleProceed}
              disabled={proceeding}
            >
              {proceeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking availability...
                </>
              ) : (
                "Proceed to Checkout"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;

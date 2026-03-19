import { bookingsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BookingData {
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  theatreName: string;
  theatreLocation: string;
  showTime: string;
  showDate: string | Date;
  seats: string[];
  totalAmount: number;
  showId?: string;
}

export const useBooking = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createBooking = async (data: BookingData, idempotencyKey?: string): Promise<string | null> => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to book tickets.",
      });
      return null;
    }

    try {
      const showDate =
        typeof data.showDate === "string"
          ? data.showDate
          : new Date(data.showDate.getTime() - (data.showDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0];

      const response = await bookingsApi.create({
        movieId: data.movieId,
        movieTitle: data.movieTitle,
        moviePoster: data.moviePoster,
        theatreName: data.theatreName,
        theatreLocation: data.theatreLocation,
        showTime: data.showTime,
        showDate: showDate,
        seats: data.seats,
        totalAmount: data.totalAmount,
        showId: data.showId,
      }, idempotencyKey);

      return response.data.bookingId;
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description:
          error.response?.data?.error ||
          (error.response?.data?.errors ? error.response.data.errors.map((e: any) => e.msg).join(", ") : null) ||
          "Unable to save your booking. Please try again.",
      });
      return null;
    }
  };

  return { createBooking };
};

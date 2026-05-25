import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import Index from "./pages/Index";
import MovieDetails from "./pages/MovieDetails";
import TheatreSelection from "./pages/TheatreSelection";
import SeatSelection from "./pages/SeatSelection";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMovies from "./pages/admin/AdminMovies";
import AdminTheatres from "./pages/admin/AdminTheatres";
import AdminShows from "./pages/admin/AdminShows";
import AdminCities from "./pages/admin/AdminCities";
import AdminMovieSelection from "./pages/admin/AdminMovieSelection";
import NotFound from "./pages/NotFound";
import AIAssistantWidget from "./components/AIAssistantWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CityProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route
                path="/movie/:id/theatres"
                element={<TheatreSelection />}
              />
              <Route path="/movie/:id/seats" element={<SeatSelection />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/success" element={<Success />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/movies" element={<AdminMovies />} />
              <Route path="/admin/theatres" element={<AdminTheatres />} />
              <Route path="/admin/shows" element={<AdminShows />} />
              <Route path="/admin/cities" element={<AdminCities />} />
              <Route
                path="/admin/movie-selection"
                element={<AdminMovieSelection />}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIAssistantWidget />
          </BrowserRouter>
        </CityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

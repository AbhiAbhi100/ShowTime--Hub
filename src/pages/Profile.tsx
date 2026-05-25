import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileApi, bookingsApi } from "@/lib/api";
import {
  User,
  Mail,
  Phone,
  LogOut,
  Ticket,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

interface Booking {
  id: string;
  bookingId: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string | null;
  theatreName: string;
  theatreLocation: string | null;
  showTime: string;
  showDate: string;
  seats: string[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

const Profile = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "bookings">("profile");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBookings();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const response = await profileApi.get();
      const data = response.data.profile;
      if (data) {
        setProfile(data);
        setFullName(data.fullName || "");
        setPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const response = await bookingsApi.getAll();
      setBookings(response.data);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      await profileApi.update({
        fullName: fullName,
        phone: phone,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 animate-fade-up">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              <div>
                <h1 className="font-display text-3xl text-foreground">
                  {profile?.fullName || "User"}
                </h1>
                <p className="text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-border mb-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "profile"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4 inline-block mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === "bookings"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ticket className="h-4 w-4 inline-block mr-2" />
              My Bookings ({bookings.length})
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="rounded-xl border border-border bg-card p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl text-foreground">
                  Personal Information
                </h2>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditing}
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditing}
                      placeholder="+91 98765 43210"
                      className="pl-10 bg-secondary border-border"
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center animate-fade-up">
                  <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-2xl text-foreground mb-2">
                    No Bookings Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't booked any tickets yet. Start exploring movies!
                  </p>
                  <Link to="/">
                    <Button variant="primary">Browse Movies</Button>
                  </Link>
                </div>
              ) : (
                bookings.map((booking, index) => (
                  <div
                    key={booking.id}
                    className="rounded-xl border border-border bg-card overflow-hidden animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Movie Poster */}
                      <div className="md:w-32 shrink-0">
                        <img
                          src={
                            booking.moviePoster ||
                            "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop"
                          }
                          alt={booking.movieTitle}
                          className="w-full h-32 md:h-full object-cover"
                        />
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1 p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  booking.status === "confirmed"
                                    ? "bg-success/20 text-success"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {booking.status.toUpperCase()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                #{booking.bookingId}
                              </span>
                            </div>
                            <h3 className="font-display text-xl text-foreground mb-3">
                              {booking.movieTitle}
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{booking.theatreName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(
                                    booking.showDate
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{booking.showTime}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Ticket className="h-4 w-4" />
                                <span>{booking.seats.join(", ")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Total Paid
                            </p>
                            <p className="font-display text-2xl text-foreground">
                              ₹{Number(booking.totalAmount).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Profile;

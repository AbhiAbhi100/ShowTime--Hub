import { useLocation, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Clock, Calendar, Ticket, Download, Share2, QrCode, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Success = () => {
  const location = useLocation();
  const { movie, theatre, show, seats, totalAmount, bookingId } = location.state || {};
  const { user } = useAuth();

  if (!movie || !bookingId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="font-display text-4xl text-foreground mb-4">Session Expired</h1>
          <Link to="/">
            <Button variant="primary">Go Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8 animate-fade-up">
            <div className="relative inline-block mb-6">
              <CheckCircle className="h-20 w-20 text-success mx-auto" />
              <div className="absolute -inset-4 bg-success/20 blur-2xl rounded-full -z-10" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-foreground mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground">
              Your tickets have been booked successfully
            </p>
          </div>

          {/* Ticket Card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-up" style={{ animationDelay: '100ms' }}>
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
                  <p className="font-mono text-lg font-bold text-foreground">{bookingId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                  <p className="font-display text-2xl text-foreground">₹{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Movie Info */}
            <div className="p-6 border-b border-border">
              <div className="flex gap-4">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-20 h-28 rounded-lg object-cover shadow-lg"
                />
                <div className="flex-1">
                  <h2 className="font-display text-2xl text-foreground mb-2">{movie.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{movie.language}</span>
                    <span>•</span>
                    <span>{movie.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid sm:grid-cols-2 gap-6 p-6 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium text-foreground">{theatre.name}</p>
                  <p className="text-sm text-muted-foreground">{theatre.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium text-foreground">
                    {new Date(show.showDate || new Date()).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">{show.showTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seats ({seats.length})</p>
                  <p className="font-medium text-foreground">
                    {seats.map((s: any) => s.id).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="p-6 bg-secondary/30">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-foreground rounded-xl flex items-center justify-center">
                  <QrCode className="h-24 w-24 text-background" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-semibold text-foreground mb-1">Scan QR at Theatre</p>
                  <p className="text-sm text-muted-foreground">
                    Show this QR code at the ticket counter to collect your tickets
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download Ticket
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {/* View Bookings / Back to Home */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
            {user && (
              <Link to="/profile">
                <Button variant="outline" size="lg" className="gap-2">
                  <User className="h-4 w-4" />
                  View My Bookings
                </Button>
              </Link>
            )}
            <Link to="/">
              <Button variant="primary" size="lg">
                Book More Tickets
              </Button>
            </Link>
          </div>

          {/* Note */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            A confirmation has been sent to your registered email and phone number.
            <br />
            Please arrive at least 15 minutes before the show time.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Success;

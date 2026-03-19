import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Star, Clock, Ticket } from 'lucide-react';
import { Movie } from '@/types';
import { Button } from '@/components/ui/button';

interface FeaturedCarouselProps {
  movies: Movie[];
  onPlayTrailer?: (movie: Movie) => void;
}

export const FeaturedCarousel = ({ movies, onPlayTrailer }: FeaturedCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const featuredMovies = movies.slice(0, 5);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
  }, [featuredMovies.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
  }, [featuredMovies.length]);

  useEffect(() => {
    if (!isAutoPlaying || featuredMovies.length === 0) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide, featuredMovies.length]);

  if (featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[currentIndex];

  return (
    <section 
      className="relative h-[70vh] md:h-[80vh] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={currentMovie.banner || currentMovie.poster}
            alt={currentMovie.title}
            className="w-full h-full object-cover"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="container relative h-full flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-2xl space-y-6"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 px-4 py-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">Featured Movie</span>
            </motion.div>

            {/* Title */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wider text-foreground leading-[0.9]">
              {currentMovie.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-accent/20 text-accent px-3 py-1.5 rounded-lg">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{currentMovie.rating}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{currentMovie.duration}</span>
              </div>
              <span className="px-3 py-1 rounded-md bg-secondary/80 text-foreground text-sm font-medium">
                {currentMovie.language}
              </span>
              <div className="flex gap-2">
                {currentMovie.genre.slice(0, 2).map((g) => (
                  <span key={g} className="text-sm text-muted-foreground">{g}</span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground line-clamp-2 max-w-lg">
              {currentMovie.description || "Experience the magic of cinema with this incredible movie."}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 pt-2">
              {(() => {
                 const releaseDate = currentMovie.releaseDate ? new Date(currentMovie.releaseDate) : new Date();
                 const today = new Date();
                 const diffTime = Math.abs(today.getTime() - releaseDate.getTime());
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                 
                 // Custom movies bypass the 14-day rule
                 // @ts-ignore - isCustom injected in Index.tsx
                 // const isOldMovie = !currentMovie.isCustom && currentMovie.releaseDate && releaseDate < today && diffDays > 14;
                 const isOldMovie = false;

                 if (isOldMovie) {
                    return (
                        <Button 
                          variant="secondary" 
                          size="lg" 
                          disabled
                          className="bg-secondary/50 text-muted-foreground cursor-not-allowed gap-2"
                        >
                          <Ticket className="h-5 w-5" />
                          Booking Closed
                        </Button>
                    );
                 }
                 
                 return (
                  <Link to={`/movie/${currentMovie.id}/theatres`}>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 gap-2"
                    >
                      <Ticket className="h-5 w-5" />
                      Book Tickets
                    </Button>
                  </Link>
                 );
              })()}
              {currentMovie.trailerUrl && onPlayTrailer && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onPlayTrailer(currentMovie)}
                  className="gap-2 bg-background/20 backdrop-blur-md border-border/50 hover:bg-background/40"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Watch Trailer
                </Button>
              )}
              <Link to={`/movie/${currentMovie.id}`}>
                <Button
                  variant="ghost"
                  size="lg"
                  className="gap-2 hover:bg-background/20"
                >
                  View Details
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-y-0 left-4 flex items-center">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={prevSlide}
          className="p-3 rounded-full bg-background/20 backdrop-blur-md border border-border/30 text-foreground hover:bg-background/40 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </motion.button>
      </div>
      <div className="absolute inset-y-0 right-4 flex items-center">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextSlide}
          className="p-3 rounded-full bg-background/20 backdrop-blur-md border border-border/30 text-foreground hover:bg-background/40 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </motion.button>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {featuredMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'w-8 h-2 bg-primary'
                : 'w-2 h-2 bg-muted-foreground/50 hover:bg-muted-foreground'
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/30">
        <motion.div
          key={currentIndex}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear' }}
          className="h-full bg-primary"
        />
      </div>
    </section>
  );
};
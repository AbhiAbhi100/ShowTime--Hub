import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX } from 'lucide-react';
import { Movie } from '@/types';

interface TrailerModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

export const TrailerModal = ({ movie, isOpen, onClose }: TrailerModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const youtubeId = movie?.trailerUrl ? extractYouTubeId(movie.trailerUrl) : null;

  return (
    <AnimatePresence>
      {isOpen && movie && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl"
        >
          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-6 right-6 p-3 rounded-full bg-secondary/80 text-foreground hover:bg-secondary transition-colors z-50"
          >
            <X className="h-6 w-6" />
          </motion.button>

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-5xl"
          >
            {/* Movie Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4 text-center"
            >
              <h2 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
                {movie.title}
              </h2>
              <p className="text-muted-foreground mt-1">Official Trailer</p>
            </motion.div>

            {/* Video Container */}
            <div className="relative rounded-2xl overflow-hidden bg-card shadow-2xl shadow-black/50 border border-border/50">
              {youtubeId ? (
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                    title={`${movie.title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-secondary/50">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <VolumeX className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-lg text-muted-foreground">Trailer not available</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Check back later for the official trailer
                  </p>
                </div>
              )}
            </div>

            {/* Movie Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground"
            >
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                {movie.language}
              </span>
              {movie.duration && (
                <span>{movie.duration}</span>
              )}
              {movie.genre.slice(0, 3).map((g) => (
                <span key={g} className="px-3 py-1 rounded-full bg-secondary">
                  {g}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
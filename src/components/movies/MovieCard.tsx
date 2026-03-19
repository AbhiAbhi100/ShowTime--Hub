import { Link } from 'react-router-dom';
import { Star, Clock, Play } from 'lucide-react';
import { Movie } from '@/types';

interface MovieCardProps {
  movie: Movie;
  index?: number;
}

export const MovieCard = ({ movie, index = 0 }: MovieCardProps) => {
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-xl bg-card shadow-card transition-all duration-500 hover:scale-[1.02] hover:shadow-glow border border-border/50 hover:border-primary/30">
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={movie.poster}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-500" />
          
          {/* Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-background/90 backdrop-blur-md px-2 py-1 border border-border/50">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="text-sm font-semibold text-foreground">{movie.rating}</span>
          </div>

          {/* Play Button on Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-glow transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="h-6 w-6 text-primary-foreground fill-primary-foreground ml-1" />
            </div>
          </div>

          {/* Duration Badge */}
          {movie.duration && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-md px-2 py-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{movie.duration}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-2 bg-gradient-to-b from-card to-card/80">
          <h3 className="font-heading text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              {movie.language}
            </span>
            <span className="text-border">•</span>
            <span className="line-clamp-1 text-xs">{movie.genre.slice(0, 2).join(', ')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

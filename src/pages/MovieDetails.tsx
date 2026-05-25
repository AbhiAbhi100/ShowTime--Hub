import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrailerModal } from '@/components/movies/TrailerModal';
import { useTMDBMovieDetails } from '@/hooks/useTMDBMovies';
import { Star, Clock, Calendar, Play, Users, ArrowLeft } from 'lucide-react';
import { Movie } from '@/types';

const MovieDetails = () => {
  const { id } = useParams();
  const { data: movie, isLoading, error } = useTMDBMovieDetails(id);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="relative h-[50vh] md:h-[60vh]">
          <Skeleton className="absolute inset-0" />
        </section>
        <section className="container relative -mt-32 z-10 pb-12">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-48 md:w-64 aspect-[2/3] rounded-xl mx-auto md:mx-0" />
            <div className="flex-1 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-48" />
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
          <h1 className="font-display text-4xl text-foreground mb-4">Movie Not Found</h1>
          <Link to="/">
            <Button variant="primary">Go Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background relative overflow-hidden flex flex-col">
      <Header />

      {/* Background Banner (Fixed) */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        {movie.banner ? (
          <img
            src={movie.banner}
            alt={movie.title}
            className="w-full h-full object-cover opacity-60 scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-black/30" />
      </div>

      {/* Main Content - Centered & Fixed */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-h-screen pt-20 pb-4 container">
         {/* Back Button */}
        <div className="mb-4 shrink-0">
             <Link
                to="/"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Home</span>
            </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start h-[calc(100vh-140px)]">
            
            {/* Poster - Static */}
            <div className="shrink-0 max-w-[220px] md:max-w-[280px] lg:max-w-[320px] w-full mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-fade-up self-center md:self-start">
                {movie.poster ? (
                <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover"
                />
                ) : (
                <div className="w-full aspect-[2/3] bg-secondary flex items-center justify-center">
                    <span className="text-muted-foreground">No Poster</span>
                </div>
                )}
            </div>

            {/* Details Column - Scrollable internally if needed */}
            <div className="flex-1 space-y-5 animate-fade-up overflow-y-auto pr-2 scrollbar-hide h-full" style={{ animationDelay: "100ms" }}>
                <div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-7xl text-white mb-3 leading-tight tracking-tight">
                    {movie.title}
                </h1>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm font-medium mb-5">
                    <div className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-bold">{movie.rating}/10</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{movie.duration}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA'}</span>
                    </div>
                    <span>•</span>
                     <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs uppercase tracking-wide">
                        {movie.language}
                    </span>
                 </div>

                 {/* Genres */}
                 <div className="flex flex-wrap gap-2 mb-5">
                    {movie.genre.map((genre) => (
                    <span
                        key={genre}
                        className="px-3 py-1 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-foreground text-xs md:text-sm font-medium border border-primary/30 transition-colors"
                    >
                        {genre}
                    </span>
                    ))}
                </div>
                </div>

                 {/* Description */}
                {movie.description && (
                  <p className="text-gray-300 leading-relaxed text-base md:text-lg max-w-3xl line-clamp-4 hover:line-clamp-none transition-all cursor-default">
                    {movie.description}
                  </p>
                )}

                 {/* Action Buttons */}
                 <div className="pt-2 flex flex-wrap gap-4 items-center">
                    {(() => {
                        const releaseDate = new Date(movie.releaseDate);
                        const today = new Date();
                        const diffTime = Math.abs(today.getTime() - releaseDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        
                        // Logic: If release date is in the past AND older than 14 days
                        // Removed 14-day restriction to allow booking for back-catalog/re-released movies
                        // const isOldMovie = releaseDate < today && diffDays > 14;
                        const isOldMovie = false; 

                        if (isOldMovie) {
                            return (
                                <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-2 pr-4 rounded-lg backdrop-blur-sm">
                                    <Button variant="secondary" size="lg" disabled className="opacity-75 cursor-not-allowed">
                                        Booking Closed
                                    </Button>
                                    <span className="text-sm text-red-200">
                                        Released &gt;14 days ago.
                                    </span>
                                </div>
                            );
                        }

                        return (
                        <Link to={`/movie/${movie.id}/theatres`}>
                            <Button variant="default" size="xl" className="font-semibold text-lg px-8 shadow-lg shadow-primary/25 hover:scale-105 transition-transform bg-primary hover:bg-primary/90 text-white">
                             Book Tickets
                            </Button>
                        </Link>
                        );
                    })()}

                    {movie.trailerUrl && (
                        <Button 
                        variant="outline" 
                        size="xl" 
                        onClick={() => setIsTrailerOpen(true)}
                        className="gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
                        >
                        <Play className="h-5 w-5 fill-current" />
                        Watch Trailer
                        </Button>
                    )}
                </div>

                {/* Cast Grid (Mini) */}
                {movie.cast.length > 0 && (
                    <div className="pt-6 border-t border-white/10">
                         <div className="flex items-center gap-2 mb-4 text-white/80">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">Top Cast</span>
                         </div>
                         <div className="flex flex-wrap gap-3">
                            {movie.cast.slice(0, 5).map((actor: any, index: number) => {
                                const name = typeof actor === 'string' ? actor : actor.name;
                                return (
                                    <div key={index} className="flex items-center gap-2 bg-black/40 rounded-full pl-1 pr-3 py-1 border border-white/10 backdrop-blur-sm">
                                         <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold">
                                            {name[0]}
                                         </div>
                                         <span className="text-sm text-gray-300">{name}</span>
                                    </div>
                                )
                            })}
                         </div>
                    </div>
                )}

            </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal 
        movie={movie as unknown as import('@/types').Movie} 
        isOpen={isTrailerOpen} 
        onClose={() => setIsTrailerOpen(false)} 
      />
    </div>
  );
};

export default MovieDetails;

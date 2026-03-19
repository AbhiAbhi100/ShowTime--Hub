import { useState, useEffect } from 'react';
import { citiesApi, theatresApi, showsApi } from '@/lib/api';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = () => {
      // Check if admin token exists in localStorage
      const adminToken = localStorage.getItem('admin_token');
      const admin = localStorage.getItem('admin');
      
      if (adminToken && admin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
};

export const useCities = () => {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await citiesApi.getAll();
        setCities(response.data);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
      setLoading(false);
    };

    fetchCities();
  }, []);

  return { cities, loading };
};

export const useTheatres = (cityId?: string) => {
  const [theatres, setTheatres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheatres = async () => {
      try {
        const response = await theatresApi.getAll(cityId);
        setTheatres(response.data);
      } catch (error) {
        console.error('Error fetching theatres:', error);
      }
      setLoading(false);
    };

    fetchTheatres();
  }, [cityId]);

  return { theatres, loading };
};

export const useShows = (movieId?: string, theatreId?: string, date?: string) => {
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        if (movieId) {
          const response = await showsApi.getByMovie(movieId, date);
          setShows(response.data);
        } else if (theatreId) {
          const response = await showsApi.getByTheatre(theatreId, date);
          setShows(response.data);
        }
      } catch (error) {
        console.error('Error fetching shows:', error);
      }
      setLoading(false);
    };

    if (movieId || theatreId) {
      fetchShows();
    } else {
      setLoading(false);
    }
  }, [movieId, theatreId, date]);

  const refetch = async () => {
    setLoading(true);
    try {
      if (movieId) {
        const response = await showsApi.getByMovie(movieId, date);
        setShows(response.data);
      } else if (theatreId) {
        const response = await showsApi.getByTheatre(theatreId, date);
        setShows(response.data);
      }
    } catch (error) {
      console.error('Error refetching shows:', error);
    }
    setLoading(false);
  };

  return { shows, loading, refetch };
};

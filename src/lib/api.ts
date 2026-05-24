import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem("admin_token");
    const userToken = localStorage.getItem("auth_token");

    // Routes that require admin authentication
    // If the request API URL starts with /admin/, we are in the admin portal, or it's a shows admin operation
    const isShowsAdminOp = config.url?.startsWith("/shows") && ['post', 'put', 'delete'].includes(config.method?.toLowerCase() || "");
    const isAdminRoute = config.url?.includes("/admin/") || window.location.pathname.startsWith("/admin") || isShowsAdminOp;
    const token = isAdminRoute && adminToken ? adminToken : userToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      // Optionally redirect to login
      // window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    api.post("/auth/register", { email, password, fullName }),

  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  getMe: () => api.get("/auth/me"),

  logout: () => api.post("/auth/logout"),
};

// Profile API
export const profileApi = {
  get: () => api.get("/profile"),

  update: (data: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    api.put("/profile", data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/profile/password", { currentPassword, newPassword }),
};

// Movies API
export const moviesApi = {
  getTMDB: (endpoint: string = "upcoming", category: string = "all") =>
    api.get(`/movies/tmdb?endpoint=${endpoint}&category=${category}`),

  searchTMDB: (query: string) => 
    api.get(`/movies/tmdb/search?query=${query}`),

  getTMDBMovie: (movieId: string) => api.get(`/movies/tmdb/${movieId}`),

  getCustom: () => api.get("/movies/custom"),

  getCustomMovie: (id: string) => api.get(`/movies/custom/${id}`),

  create: (data: any) => api.post("/movies/custom", data),

  update: (id: string, data: any) => api.put(`/movies/custom/${id}`, data),

  delete: (id: string) => api.delete(`/movies/custom/${id}`),
};

// Cities API
export const citiesApi = {
  getAll: (includeInactive?: boolean) =>
    api.get(`/cities${includeInactive ? "?all=true" : ""}`),

  get: (id: string) => api.get(`/cities/${id}`),

  create: (data: { name: string; state?: string; icon?: string }) =>
    api.post("/cities", data),

  update: (id: string, data: any) => api.put(`/cities/${id}`, data),

  delete: (id: string) => api.delete(`/cities/${id}`),
};

// Theatres API
export const theatresApi = {
  getAll: (cityId?: string) =>
    api.get(`/theatres${cityId ? `?cityId=${cityId}` : ""}`),

  getAllAdmin: () => api.get("/theatres/admin/all"),

  get: (id: string) => api.get(`/theatres/${id}`),

  create: (data: any) => api.post("/theatres", data),

  update: (id: string, data: any) => api.put(`/theatres/${id}`, data),

  delete: (id: string) => api.delete(`/theatres/${id}`),
};

// Shows API
export const showsApi = {
  getByMovie: (movieId: string, date?: string, cityId?: string) => {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (cityId) params.append("cityId", cityId);
    return api.get(`/shows/movie/${movieId}?${params.toString()}`);
  },

  getByTheatre: (theatreId: string, date?: string) =>
    api.get(`/shows/theatre/${theatreId}${date ? `?date=${date}` : ""}`),

  get: (id: string) => api.get(`/shows/${id}`),

  getAllAdmin: () => api.get("/shows/admin/all"),

  create: (data: any) => api.post("/shows", data),

  update: (id: string, data: any) => api.put(`/shows/${id}`, data),

  delete: (id: string) => api.delete(`/shows/${id}`),
  
  lock: (id: string, seats: string[]) => api.post(`/shows/${id}/lock`, { seats }),
  
  unlock: (id: string, seats: string[]) => api.post(`/shows/${id}/unlock`, { seats }),
  
  cleanup: () => api.post("/shows/admin/cleanup"),
  
  seed: () => api.post("/shows/admin/seed"),
};

// Bookings API
export const bookingsApi = {
  getAll: () => api.get("/bookings"),

  get: (id: string) => api.get(`/bookings/${id}`),

  getByRef: (bookingId: string) => api.get(`/bookings/ref/${bookingId}`),

  create: (data: {
    movieId: string;
    movieTitle: string;
    moviePoster?: string;
    theatreName: string;
    theatreLocation?: string;
    showTime: string;
    showDate: string;
    seats: string[];
    totalAmount: number;
    showId?: string;
  }, idempotencyKey?: string) => api.post("/bookings", data, {
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}
  }),

  cancel: (id: string) => api.put(`/bookings/${id}/cancel`),
};

// Admin API
export const adminApi = {
  login: (email: string, password: string) =>
    api.post("/admin/login", { email, password }),

  getMe: () => api.get("/admin/me"),

  getDashboardStats: () => api.get("/admin/dashboard/stats"),

  getBookings: (params?: { status?: string; limit?: number; page?: number }) =>
    api.get("/admin/bookings", { params }),

  getUsers: (params?: { limit?: number; page?: number }) =>
    api.get("/admin/users", { params }),

  createAdmin: (email: string, password: string, isSuperAdmin?: boolean) =>
    api.post("/admin/create", { email, password, isSuperAdmin }),

  // Featured movies
  getFeaturedMovies: () => api.get("/admin/featured-movies"),

  addFeaturedMovie: (data: {
    movieId: string;
    movieType: "tmdb" | "custom";
    title: string;
    poster: string;
    displayOrder?: number;
  }) => api.post("/admin/featured-movies", data),

  removeFeaturedMovie: (id: string) =>
    api.delete(`/admin/featured-movies/${id}`),

  updateFeaturedMovie: (id: string, data: any) =>
    api.put(`/admin/featured-movies/${id}`, data),
};

// AI API
export const aiApi = {
  chat: (message: string, history: any[]) =>
    api.post("/ai/chat", { message, history }),
};

export default api;

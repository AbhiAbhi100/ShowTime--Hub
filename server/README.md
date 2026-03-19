# ShowTime Hub - Backend Server

A Node.js/Express backend for the ShowTime Hub movie booking application, using MongoDB as the database.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- TMDB API Key (get from https://www.themoviedb.org/settings/api)

## Installation

1. Navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

```env
MONGODB_URI=mongodb://localhost:27017/showtime-hub
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=5000
TMDB_API_KEY=your-tmdb-api-key
CLIENT_URL=http://localhost:8081
NODE_ENV=development
```

5. Seed the database with initial data:

```bash
npm run seed
```

6. Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Profile

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `PUT /api/profile/password` - Change password

### Movies

- `GET /api/movies/tmdb` - Get movies from TMDB
- `GET /api/movies/tmdb/:movieId` - Get movie details from TMDB
- `GET /api/movies/custom` - Get custom movies
- `POST /api/movies/custom` - Create custom movie (admin)
- `PUT /api/movies/custom/:id` - Update custom movie (admin)
- `DELETE /api/movies/custom/:id` - Delete custom movie (admin)

### Cities

- `GET /api/cities` - Get all cities
- `POST /api/cities` - Create city (admin)
- `PUT /api/cities/:id` - Update city (admin)
- `DELETE /api/cities/:id` - Delete city (admin)

### Theatres

- `GET /api/theatres` - Get all theatres
- `GET /api/theatres?cityId=xxx` - Get theatres by city
- `GET /api/theatres/admin/all` - Get all theatres (admin)
- `POST /api/theatres` - Create theatre (admin)
- `PUT /api/theatres/:id` - Update theatre (admin)
- `DELETE /api/theatres/:id` - Delete theatre (admin)

### Shows

- `GET /api/shows/movie/:movieId` - Get shows for a movie
- `GET /api/shows/theatre/:theatreId` - Get shows for a theatre
- `GET /api/shows/:id` - Get show with booked seats
- `GET /api/shows/admin/all` - Get all shows (admin)
- `POST /api/shows` - Create show (admin)
- `PUT /api/shows/:id` - Update show (admin)
- `DELETE /api/shows/:id` - Delete show (admin)

### Bookings

- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get single booking
- `GET /api/bookings/ref/:bookingId` - Get booking by reference ID
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Admin

- `POST /api/admin/login` - Admin login
- `GET /api/admin/me` - Get admin profile
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/users` - Get all users
- `POST /api/admin/create` - Create new admin (super admin)

## Default Admin Credentials

After running the seed script:

- **Email**: admin@showtime.com
- **Password**: admin123

⚠️ **Important**: Change these credentials in production!

## Project Structure

```
server/
├── src/
│   ├── index.ts           # Application entry point
│   ├── middleware/
│   │   └── auth.ts        # JWT authentication middleware
│   ├── models/
│   │   ├── User.ts        # User model
│   │   ├── Admin.ts       # Admin model
│   │   ├── City.ts        # City model
│   │   ├── Movie.ts       # Custom movie model
│   │   ├── Theatre.ts     # Theatre model
│   │   ├── Show.ts        # Show model
│   │   ├── Booking.ts     # Booking model
│   │   └── index.ts       # Models export
│   ├── routes/
│   │   ├── auth.ts        # Auth routes
│   │   ├── profile.ts     # Profile routes
│   │   ├── movies.ts      # Movies routes
│   │   ├── cities.ts      # Cities routes
│   │   ├── theatres.ts    # Theatres routes
│   │   ├── shows.ts       # Shows routes
│   │   ├── bookings.ts    # Bookings routes
│   │   └── admin.ts       # Admin routes
│   └── scripts/
│       └── seed.ts        # Database seed script
├── package.json
├── tsconfig.json
└── .env.example
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run seed` - Seed the database

## Environment Variables

| Variable       | Description               | Default                                |
| -------------- | ------------------------- | -------------------------------------- |
| MONGODB_URI    | MongoDB connection string | mongodb://localhost:27017/showtime-hub |
| JWT_SECRET     | Secret key for JWT        | -                                      |
| JWT_EXPIRES_IN | JWT expiration time       | 7d                                     |
| PORT           | Server port               | 5000                                   |
| TMDB_API_KEY   | TMDB API key              | -                                      |
| CLIENT_URL     | Frontend URL for CORS     | http://localhost:8081                  |
| NODE_ENV       | Environment               | development                            |

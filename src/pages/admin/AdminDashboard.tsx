import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Film, Building2, Calendar, Ticket, TrendingUp, Users, DollarSign } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { adminApi } from '@/lib/api';

interface Stats {
  totalMovies: number;
  totalTheatres: number;
  totalShows: number;
  totalBookings: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalMovies: 0,
    totalTheatres: 0,
    totalShows: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getDashboardStats();
        const { stats: dashboardStats } = response.data;

        setStats({
          totalMovies: dashboardStats.totalMovies || 0,
          totalTheatres: dashboardStats.totalTheatres || 0,
          totalShows: dashboardStats.totalShows || 0,
          totalBookings: dashboardStats.totalBookings || 0,
          totalRevenue: dashboardStats.totalRevenue || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Custom Movies', value: stats.totalMovies, icon: Film, color: 'primary' },
    { label: 'Theatres', value: stats.totalTheatres, icon: Building2, color: 'accent' },
    { label: 'Active Shows', value: stats.totalShows, icon: Calendar, color: 'success' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: Ticket, color: 'info' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'warning', isRevenue: true },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl p-6 border border-border/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-2 ${stat.isRevenue ? 'text-gradient-gold' : 'text-foreground'}`}>
                    {loading ? (
                      <span className="h-8 w-20 bg-muted rounded animate-pulse inline-block" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}/20`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <a href="/admin/movies" className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Film className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm font-medium">Add Movie</span>
              </a>
              <a href="/admin/theatres" className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Building2 className="h-6 w-6 text-accent mb-2" />
                <span className="text-sm font-medium">Add Theatre</span>
              </a>
              <a href="/admin/shows" className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Calendar className="h-6 w-6 text-success mb-2" />
                <span className="text-sm font-medium">Schedule Show</span>
              </a>
              <a href="/" target="_blank" className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <TrendingUp className="h-6 w-6 text-info mb-2" />
                <span className="text-sm font-medium">View Site</span>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">TMDB API</span>
                <span className="flex items-center gap-2 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="flex items-center gap-2 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Authentication</span>
                <span className="flex items-center gap-2 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

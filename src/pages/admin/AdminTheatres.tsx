import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Building2, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { theatresApi, citiesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Theatre {
  id: string;
  name: string;
  city: { id: string; name: string };
  address?: string;
  totalSeats: number;
  amenities?: string[];
  isActive: boolean;
}

interface City {
  id: string;
  name: string;
}

const amenityOptions = [
  "Parking",
  "Food Court",
  "Dolby Atmos",
  "IMAX",
  "3D",
  "Recliner Seats",
  "Wheelchair Accessible",
  "AC",
];

const AdminTheatres = () => {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTheatre, setEditingTheatre] = useState<Theatre | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    totalSeats: 120,
    amenities: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTheatres();
    fetchCities();
  }, []);

  const fetchTheatres = async () => {
    try {
      const response = await theatresApi.getAllAdmin();
      setTheatres(response.data);
    } catch (error) {
      console.error("Failed to fetch theatres:", error);
    }
    setLoading(false);
  };

  const fetchCities = async () => {
    try {
      const response = await citiesApi.getAll(true);
      setCities(response.data);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTheatre) {
        await theatresApi.update(editingTheatre.id, formData);
        toast({ title: "Theatre updated successfully" });
      } else {
        await theatresApi.create(formData);
        toast({ title: "Theatre created successfully" });
      }
      closeDialog();
      fetchTheatres();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: editingTheatre
          ? "Failed to update theatre"
          : "Failed to create theatre",
        description: error.response?.data?.error || "An error occurred",
      });
    }
  };

  const handleEdit = (theatre: Theatre) => {
    setEditingTheatre(theatre);
    setFormData({
      name: theatre.name,
      city: theatre.city?.id || "",
      address: theatre.address || "",
      totalSeats: theatre.totalSeats || 120,
      amenities: theatre.amenities || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this theatre?")) return;
    try {
      await theatresApi.delete(id);
      toast({ title: "Theatre deleted successfully" });
      fetchTheatres();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete theatre" });
    }
  };

  const handleToggleActive = async (theatre: Theatre) => {
    try {
      await theatresApi.update(theatre.id, { isActive: !theatre.isActive });
      toast({
        title: `Theatre ${theatre.isActive ? "deactivated" : "activated"}`,
      });
      fetchTheatres();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update theatre" });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTheatre(null);
    setFormData({
      name: "",
      city: "",
      address: "",
      totalSeats: 120,
      amenities: [],
    });
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const filteredTheatres = theatres.filter(
    (theatre) =>
      theatre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      theatre.city?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Theatres Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search theatres..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="gradient-primary"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Theatre
          </Button>
        </div>

        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Theatre
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  City
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Seats
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Amenities
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredTheatres.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No theatres added yet</p>
                    <p className="text-sm mt-1">
                      Click "Add Theatre" to create your first theatre
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTheatres.map((theatre) => (
                  <motion.tr
                    key={theatre.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/30"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{theatre.name}</p>
                        {theatre.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {theatre.address}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {theatre.city?.name}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {theatre.totalSeats}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {theatre.amenities?.slice(0, 2).map((a) => (
                          <span
                            key={a}
                            className="px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            {a}
                          </span>
                        ))}
                        {(theatre.amenities?.length || 0) > 2 && (
                          <span className="px-2 py-0.5 bg-muted rounded text-xs">
                            +{theatre.amenities!.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Switch
                        checked={theatre.isActive}
                        onCheckedChange={() => handleToggleActive(theatre)}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(theatre)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(theatre.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Theatre Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTheatre ? "Edit Theatre" : "Add New Theatre"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Theatre Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="totalSeats">Total Seats</Label>
                <Input
                  id="totalSeats"
                  type="number"
                  min="1"
                  value={formData.totalSeats}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalSeats: parseInt(e.target.value) || 120,
                    })
                  }
                />
              </div>
              <div>
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {amenityOptions.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        formData.amenities.includes(amenity)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary">
                  {editingTheatre ? "Update Theatre" : "Create Theatre"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminTheatres;

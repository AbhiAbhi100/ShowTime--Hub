import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, MapPin, Check, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { citiesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface City {
  id: string; // Changed from _id to id for Sequelize compatibility
  name: string;
  code: string;
  state?: string;
  icon?: string;
  isActive: boolean;
}

const AdminCities = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    state: "",
    icon: "🏙️",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await citiesApi.getAll(true); // Include inactive cities
      setCities(response.data);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
      toast({ variant: "destructive", title: "Failed to fetch cities" });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCity) {
        await citiesApi.update(editingCity.id, formData);
        toast({ title: "City updated successfully" });
      } else {
        await citiesApi.create(formData);
        toast({ title: "City created successfully" });
      }
      setIsDialogOpen(false);
      setEditingCity(null);
      setFormData({ name: "", code: "", state: "", icon: "🏙️" });
      fetchCities();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: editingCity ? "Failed to update city" : "Failed to create city",
        description: error.response?.data?.error || "An error occurred",
      });
    }
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      code: city.code || "",
      state: city.state || "",
      icon: city.icon || "🏙️",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this city?")) return;
    try {
      await citiesApi.delete(id);
      toast({ title: "City deleted successfully" });
      fetchCities();
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Failed to delete city",
        description: error.response?.data?.details || error.response?.data?.error || "An error occurred" 
      });
    }
  };

  const handleToggleActive = async (city: City) => {
    try {
      await citiesApi.update(city.id, { isActive: !city.isActive });
      toast({ title: `City ${city.isActive ? "deactivated" : "activated"}` });
      fetchCities();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update city status" });
    }
  };

  const filteredCities = cities.filter(
    (city) =>
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const iconOptions = [
    "🏙️",
    "🏛️",
    "💻",
    "🕌",
    "🛕",
    "🌉",
    "⛰️",
    "🏗️",
    "🌊",
    "🏰",
  ];

  return (
    <AdminLayout title="Cities Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cities..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="gradient-primary"
                onClick={() => {
                  setEditingCity(null);
                  setFormData({ name: "", code: "", state: "", icon: "🏙️" });
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add City
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCity ? "Edit City" : "Add New City"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>City Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter city name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>City Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. MUM"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="Enter state name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-2 text-2xl rounded-lg border transition-colors ${
                          formData.icon === icon
                            ? "border-primary bg-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary">
                  {editingCity ? "Update City" : "Create City"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  City
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  State
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
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredCities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No cities found
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <motion.tr
                    key={city.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t border-border/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{city.icon || "🏙️"}</span>
                        <span className="font-medium text-foreground">
                          {city.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {city.state || "-"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(city)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          city.isActive
                            ? "bg-success/20 text-success hover:bg-success/30"
                            : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                        }`}
                      >
                        {city.isActive ? (
                          <>
                            <Check className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(city)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(city.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCities;

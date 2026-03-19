import { motion } from "framer-motion";
import { MapPin, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCity } from "@/contexts/CityContext";

export const CitySelector = () => {
  const { cities, selectedCity, setSelectedCity, loading } = useCity();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 animate-pulse">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {selectedCity?.name || "Select City"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 max-h-[300px] overflow-y-auto bg-card/95 backdrop-blur-xl border-border"
      >
        {cities.map((city, index) => (
          <motion.div
            key={city.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <DropdownMenuItem
              className="flex items-center justify-between cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedCity(city)}
            >
              <div className="flex items-center gap-2">
                {city.icon && <span className="text-lg">{city.icon}</span>}
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {city.name}
                  </span>
                  {city.state && (
                    <span className="text-xs text-muted-foreground">
                      {city.state}
                    </span>
                  )}
                </div>
              </div>
              {(selectedCity?.id === city.id) && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          </motion.div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

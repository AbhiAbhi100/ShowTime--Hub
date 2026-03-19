import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { citiesApi } from "@/lib/api";

interface City {
  id: string;
  name: string;
  state: string | null;
  icon?: string;
}

interface CityContextType {
  cities: City[];
  selectedCity: City | null;
  setSelectedCity: (city: City) => void;
  loading: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCityState] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await citiesApi.getAll();
        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
          // Map cities to include both id and _id for compatibility
          const mappedCities = data.map((c: any) => ({
            ...c,
            id: c.id || c._id,
          }));
          setCities(mappedCities);

          // Load saved city from localStorage or default to Mumbai
          const savedCityId = localStorage.getItem("selectedCityId");
          const savedCity = savedCityId
            ? mappedCities.find((c: City) => c.id === savedCityId)
            : null;

          // If saved city doesn't exist anymore (deleted), clear it and use default
          if (savedCityId && !savedCity) {
            localStorage.removeItem("selectedCityId");
          }

          const defaultCity =
            savedCity ||
            mappedCities.find((c: City) => c.name === "Mumbai") ||
            mappedCities[0];

          if (defaultCity) {
            setSelectedCityState(defaultCity);
            // Save the valid city to localStorage
            localStorage.setItem("selectedCityId", defaultCity.id);
          }
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
      setLoading(false);
    };

    fetchCities();
  }, []);

  const setSelectedCity = (city: City) => {
    setSelectedCityState(city);
    localStorage.setItem("selectedCityId", city.id);
  };

  return (
    <CityContext.Provider
      value={{ cities, selectedCity, setSelectedCity, loading }}
    >
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
};

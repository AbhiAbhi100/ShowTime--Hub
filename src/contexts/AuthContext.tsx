import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and user in localStorage
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");
    const adminToken = localStorage.getItem("admin_token");

    // If we have a user but no auth_token (only admin_token), the user object is actually the admin object leaking over.
    if (!storedToken && adminToken && storedUser) {
        localStorage.removeItem("user");
        setLoading(false);
        return;
    }

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Verify token is still valid
      authApi
        .getMe()
        .then((response) => {
          setUser(response.data.user);
          localStorage.setItem("user", JSON.stringify(response.data.user));
        })
        .catch(() => {
          // Token is invalid, clear storage
          localStorage.removeItem("auth_token");
          // Only remove user if there's no admin token, or if we want to be safe, just remove it.
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If auth_token or user keys change in another tab, sync the state here
      if (e.key === "auth_token" || e.key === "user" || e.key === null) {
        const storedToken = localStorage.getItem("auth_token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Only update if it's actually different to avoid unnecessary re-renders
            setUser(parsedUser);
            setToken(storedToken);
          } catch(err) {
            console.error("Failed to parse user from storage event", err);
          }
        } else {
          setToken(null);
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await authApi.register(email, password, fullName);
      const { user: userData, token: authToken } = response.data;

      localStorage.setItem("auth_token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      return { error: null };
    } catch (error: any) {
      const message =
        error.response?.data?.error || error.message || "Registration failed";
      return { error: new Error(message) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const { user: userData, token: authToken } = response.data;

      localStorage.setItem("auth_token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      return { error: null };
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      let message = error.message || "Login failed";

      if (typeof apiError === "string") {
        message = apiError;
      } else if (typeof apiError === "object" && apiError !== null) {
        message = apiError.message || apiError.msg || JSON.stringify(apiError);
      }

      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

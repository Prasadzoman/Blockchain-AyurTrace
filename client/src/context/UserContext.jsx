import React, { createContext, useState, useEffect } from "react";

// 1. Create the context
export const UserContext = createContext();

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// 2. Create the provider
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // holds logged-in user info
  const [loading, setLoading] = useState(true);

  // Fetch current user from backend on app load
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, {
          credentials: "include", // send cookies
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data); // depends on your backend response
        } else {
          setUser(null);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Auth check failed:", err);
        }
        setUser(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchUser();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading, setLoading }}>
      {children}
    </UserContext.Provider>
  );
};

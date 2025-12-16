import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔄 AuthProvider useEffect gestartet");

    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    console.log("📁 localStorage Inhalt:", {
      token: token,
      userData: userData,
      alleKeys: Object.keys(localStorage),
    });

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log("✅ User erfolgreich geparsed:", parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("❌ Fehler beim Parsen:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    } else {
      console.log("ℹ️ Keine User-Daten im localStorage gefunden");
    }

    console.log("🏁 AuthProvider Loading beendet");
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    console.log("🔐 AuthContext login called:", { userData, token });

    // Stelle sicher, dass userData ein Objekt ist
    if (typeof userData === "object" && userData !== null) {
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      console.log("✅ User erfolgreich gespeichert");
    } else {
      console.error("❌ Ungültiges userData Format:", userData);
    }
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

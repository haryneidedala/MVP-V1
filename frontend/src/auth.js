// Utility-Funktionen für Token-Handling
export const getToken = () => {
  return localStorage.getItem("authToken") || localStorage.getItem("token");
};

export const setToken = (token) => {
  localStorage.setItem("authToken", token);
};

export const clearTokens = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
};

export const refreshAccessToken = async () => {
  try {
    console.log("🔄 Versuche Token zu refreshen...");

    const response = await fetch("http://localhost:5001/refresh", {
      method: "POST",
      credentials: "include", // Wichtig für Cookies
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Token erfolgreich refreshed");

      // Neuen Token speichern
      if (data.access_token) {
        setToken(data.access_token);
      }

      return data;
    } else {
      console.error("❌ Token Refresh fehlgeschlagen");
      return null;
    }
  } catch (error) {
    console.error("❌ Fehler beim Token Refresh:", error);
    return null;
  }
};

export const makeAuthenticatedRequest = async (url, options = {}) => {
  let token = getToken();

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
    credentials: "include",
  });

  // Wenn 401, versuche Token zu refreshen
  if (response.status === 401) {
    console.log("⚠️ 401 Fehler, versuche Token Refresh...");

    const refreshData = await refreshAccessToken();

    if (refreshData && refreshData.access_token) {
      // Wiederhole den Request mit neuem Token
      defaultHeaders["Authorization"] = `Bearer ${refreshData.access_token}`;
      response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
        credentials: "include",
      });
    } else {
      // Refresh fehlgeschlagen -> Logout
      clearTokens();
      window.location.href = "/login";
      throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
    }
  }

  return response;
};

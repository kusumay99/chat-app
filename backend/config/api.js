import * as SecureStore from "expo-secure-store";

// ----------------------------
// CONFIG
// ----------------------------
export const API_BASE_URL = "http://192.168.0.122:5000/api";

// ----------------------------
// API FETCH UTILITY
// ----------------------------
export const apiFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const token = await SecureStore.getItemAsync("authToken");
    const url = `${API_BASE_URL}${endpoint}`;

    console.log("📡 API URL:", url);
    console.log("🔑 TOKEN:", token ? "EXISTS" : "MISSING");

    // ----------------------------
    // PUBLIC ROUTES
    // ----------------------------
    const publicRoutes = ["/auth/login", "/auth/register"];

    const isPublic = publicRoutes.some((route) =>
      endpoint.includes(route)
    );

    if (!token && !isPublic) {
      console.log("🚫 BLOCKED: No token");
      throw new Error("AUTH_REQUIRED");
    }

    // ----------------------------
    // HANDLE BODY TYPE
    // ----------------------------
    const isFormData = options.body instanceof FormData;

    // ----------------------------
    // BUILD REQUEST
    // ----------------------------
    const fetchOptions = {
      method: options.method || "GET",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
      },
      body: options.body
        ? isFormData
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
      signal: controller.signal,
    };

    console.log("📦 HEADERS:", fetchOptions.headers);

    // ----------------------------
    // API CALL
    // ----------------------------
    const response = await fetch(url, fetchOptions);

    // ----------------------------
    // PARSE RESPONSE
    // ----------------------------
    let data = {};

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.log("⚠️ JSON Parse Error:", err.message);
      throw new Error("INVALID_RESPONSE");
    }

    // ----------------------------
    // HANDLE ERRORS
    // ----------------------------
    if (!response.ok) {
      if (response.status === 401) {
        console.log("🔐 TOKEN EXPIRED / INVALID");

        // ✅ clear token
        await SecureStore.deleteItemAsync("authToken");

        throw new Error("SESSION_EXPIRED");
      }

      throw new Error(data?.message || `HTTP_${response.status}`);
    }

    return data;

  } catch (error) {
    console.log("❌ API ERROR:", error.message);

    // ----------------------------
    // TIMEOUT
    // ----------------------------
    if (error.name === "AbortError") {
      throw new Error("REQUEST_TIMEOUT");
    }

    // ----------------------------
    // NETWORK ERROR
    // ----------------------------
    if (error.message === "Network request failed") {
      console.log("🚨 NETWORK ISSUE:");
      console.log("👉 Check backend / WiFi / IP");

      throw new Error("NETWORK_ERROR");
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
};
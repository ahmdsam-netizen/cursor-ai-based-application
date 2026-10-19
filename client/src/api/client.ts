// This dynamic check handles both Local and Production environments
const API_BASE = (import.meta as any).env.VITE_API_URL || "";
const API = `${API_BASE}/api`;

export function getToken(): string | null {
  return localStorage.getItem("ef_token");
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    const errorMsg = (import.meta as any).env.DEV
      ? "Cannot reach API — ensure server is running on PORT 5050 and check vite.config.js proxy."
      : "Network error: Unable to connect to the server. Please try again later.";
    throw new Error(errorMsg);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  geolocate: () => request("/events/geolocate"),
  citiesForCountry: (country: string) =>
    request(`/events/cities?country=${encodeURIComponent(country)}`),
  nearestCity: (lat: number | string, lng: number | string) =>
    request(`/events/nearest-city?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
  directions: (fromLat: number | string, fromLng: number | string, toLat: number | string, toLng: number | string) => {
    const q = new URLSearchParams({
      fromLat: String(fromLat),
      fromLng: String(fromLng),
      toLat: String(toLat),
      toLng: String(toLng),
    });
    return request(`/events/directions?${q}`);
  },
  regionCenter: (country: string, city?: string | null) =>
    request(
      `/events/region-center?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city || "")}`
    ),
  searchEvents: (params: Record<string, any>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      q.set(k, String(v));
    });
    return request(`/events/search?${q.toString()}`);
  },
  getEvent: (id: string, lat?: number | string | null, lng?: number | string | null) => {
    const q = new URLSearchParams();
    if (lat != null) q.set("lat", String(lat));
    if (lng != null) q.set("lng", String(lng));
    const qs = q.toString();
    return request(`/events/${id}${qs ? `?${qs}` : ""}`);
  },
  trending: (lat?: number | string | null, lng?: number | string | null) => {
    const q = new URLSearchParams();
    if (lat != null) q.set("lat", String(lat));
    if (lng != null) q.set("lng", String(lng));
    return request(`/events/trending?${q.toString()}`);
  },
  recommendations: (lat?: number | string | null, lng?: number | string | null) => {
    const q = new URLSearchParams();
    if (lat != null) q.set("lat", String(lat));
    if (lng != null) q.set("lng", String(lng));
    return request(`/events/recommendations?${q.toString()}`);
  },
  register: (body: any) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  organizerListEvents: () => request("/organizer/events"),
  organizerCreateEvent: (body: any) =>
    request("/organizer/events", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  updateInterests: (interests: string[]) =>
    request("/user/interests", { method: "PATCH", body: JSON.stringify({ interests }) }),
  favorites: () => request("/user/favorites"),
  addFavorite: (eventId: string) => request(`/user/favorites/${eventId}`, { method: "POST" }),
  removeFavorite: (eventId: string) => request(`/user/favorites/${eventId}`, { method: "DELETE" }),
  notificationsPreview: () => request("/user/notifications-preview"),
  markNotificationsSent: (eventIds: string[]) =>
    request("/user/notifications/mark-sent", {
      method: "POST",
      body: JSON.stringify({ eventIds }),
    }),
  assistantChat: (message: string) =>
    request("/assistant/chat", { method: "POST", body: JSON.stringify({ message }) }),
};

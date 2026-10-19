export interface EventItem {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
  priceRange?: string;
  image?: string;
  url?: string;
  description?: string;
  source?: string;
  category?: string;
  distanceKm?: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  label?: string;
}

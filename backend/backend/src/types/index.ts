export type UserRole = "rider" | "driver";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
  created_at: string;
}

export type RideStatus =
  | "requested"
  | "accepted"
  | "driver_arriving"
  | "in_progress"
  | "completed"
  | "paid"
  | "cancelled";

export interface Ride {
  id: string;
  rider_id: string;
  driver_id: string | null;
  status: RideStatus;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  fare: number | null;
  requested_at: string;
  completed_at: string | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

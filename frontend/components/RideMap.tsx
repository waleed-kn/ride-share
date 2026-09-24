"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Coordinates } from "@/lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface RideMapProps {
  center: Coordinates;
  pickup?: Coordinates | null;
  dropoff?: Coordinates | null;
  driverPosition?: Coordinates | null;
  onPickupChange?: (coords: Coordinates) => void;
}

export function RideMap({ center, pickup, dropoff, driverPosition, onPickupChange }: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center.lng, center.lat],
      zoom: 13,
    });

    if (onPickupChange) {
      mapRef.current.on("click", (e) => {
        onPickupChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pickup marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!pickup) {
      pickupMarker.current?.remove();
      pickupMarker.current = null;
      return;
    }
    if (!pickupMarker.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:50%;background:#3D5AFE;border:2px solid #F7F7F5;";
      pickupMarker.current = new mapboxgl.Marker(el);
    }
    pickupMarker.current.setLngLat([pickup.lng, pickup.lat]).addTo(mapRef.current);
  }, [pickup]);

  // Dropoff marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!dropoff) {
      dropoffMarker.current?.remove();
      dropoffMarker.current = null;
      return;
    }
    if (!dropoffMarker.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:50%;background:#2ECC71;border:2px solid #F7F7F5;";
      dropoffMarker.current = new mapboxgl.Marker(el);
    }
    dropoffMarker.current.setLngLat([dropoff.lng, dropoff.lat]).addTo(mapRef.current);
  }, [dropoff]);

  // Live driver marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!driverPosition) {
      driverMarker.current?.remove();
      driverMarker.current = null;
      return;
    }
    if (!driverMarker.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:6px;background:#F7F7F5;border:2px solid #3D5AFE;box-shadow:0 0 0 4px rgba(61,90,254,0.25);";
      driverMarker.current = new mapboxgl.Marker(el);
    }
    driverMarker.current.setLngLat([driverPosition.lng, driverPosition.lat]).addTo(mapRef.current);
  }, [driverPosition]);

  return <div ref={containerRef} className="h-full w-full" />;
}

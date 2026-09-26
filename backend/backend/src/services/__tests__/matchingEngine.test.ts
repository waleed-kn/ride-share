import { describe, it, expect } from "vitest";
import {
  distanceKm,
  rankDriversByDistance,
  calculateFare,
} from "../matchingEngine";

// Real-world reference points for sanity-checking distance math
const PESHAWAR = { lat: 34.0151, lng: 71.5249 };
const ISLAMABAD = { lat: 33.6844, lng: 73.0479 };

describe("matchingEngine", () => {
  describe("distanceKm", () => {
    it("returns 0 for identical points", () => {
      expect(distanceKm(PESHAWAR, PESHAWAR)).toBeCloseTo(0, 5);
    });

    it("matches known real-world distance within reasonable tolerance", () => {
      // Peshawar to Islamabad is ~145km by air (great-circle distance)
      const d = distanceKm(PESHAWAR, ISLAMABAD);
      expect(d).toBeGreaterThan(130);
      expect(d).toBeLessThan(160);
    });

    it("is symmetric — order of points doesn't matter", () => {
      const a = distanceKm(PESHAWAR, ISLAMABAD);
      const b = distanceKm(ISLAMABAD, PESHAWAR);
      expect(a).toBeCloseTo(b, 8);
    });
  });

  describe("rankDriversByDistance", () => {
    const pickup = { lat: 34.0, lng: 71.5 };

    it("sorts nearest driver first", () => {
      const candidates = [
        { driverId: "far", location: { lat: 34.5, lng: 72.0 } },
        { driverId: "near", location: { lat: 34.001, lng: 71.501 } },
        { driverId: "mid", location: { lat: 34.1, lng: 71.6 } },
      ];

      const ranked = rankDriversByDistance(pickup, candidates);

      expect(ranked.map((d) => d.driverId)).toEqual(["near", "mid", "far"]);
    });

    it("returns an empty array when there are no candidates", () => {
      expect(rankDriversByDistance(pickup, [])).toEqual([]);
    });

    it("attaches a distanceKm value to every result", () => {
      const candidates = [
        { driverId: "d1", location: { lat: 34.01, lng: 71.51 } },
      ];
      const ranked = rankDriversByDistance(pickup, candidates);
      expect(ranked[0].distanceKm).toBeGreaterThan(0);
    });
  });

  describe("calculateFare", () => {
    it("returns just the base fare for zero-distance trips", () => {
      const fare = calculateFare(PESHAWAR, PESHAWAR, 2.0, 0.8);
      expect(fare).toBeCloseTo(2.0, 2);
    });

    it("scales with distance using the configured per-km rate", () => {
      const shortTrip = calculateFare(
        PESHAWAR,
        { lat: 34.02, lng: 71.53 },
        2.0,
        0.8
      );
      const longTrip = calculateFare(PESHAWAR, ISLAMABAD, 2.0, 0.8);
      expect(longTrip).toBeGreaterThan(shortTrip);
    });

    it("rounds to the nearest cent", () => {
      const fare = calculateFare(
        PESHAWAR,
        { lat: 34.016, lng: 71.526 },
        2.0,
        0.8
      );
      // fare should have at most 2 decimal places
      expect(Number.isInteger(fare * 100)).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  isTerminal,
  InvalidRideTransitionError,
} from "../rideStateMachine";

describe("rideStateMachine", () => {
  describe("canTransition", () => {
    it("allows the full happy-path lifecycle", () => {
      expect(canTransition("requested", "accepted")).toBe(true);
      expect(canTransition("accepted", "driver_arriving")).toBe(true);
      expect(canTransition("driver_arriving", "in_progress")).toBe(true);
      expect(canTransition("in_progress", "completed")).toBe(true);
      expect(canTransition("completed", "paid")).toBe(true);
    });

    it("allows cancellation before pickup", () => {
      expect(canTransition("requested", "cancelled")).toBe(true);
      expect(canTransition("accepted", "cancelled")).toBe(true);
    });

    it("rejects cancellation once a ride is in progress", () => {
      expect(canTransition("in_progress", "cancelled")).toBe(false);
      expect(canTransition("completed", "cancelled")).toBe(false);
    });

    it("rejects skipping states", () => {
      expect(canTransition("requested", "in_progress")).toBe(false);
      expect(canTransition("requested", "completed")).toBe(false);
      expect(canTransition("accepted", "completed")).toBe(false);
    });

    it("rejects moving backwards", () => {
      expect(canTransition("in_progress", "accepted")).toBe(false);
      expect(canTransition("completed", "in_progress")).toBe(false);
    });

    it("treats paid and cancelled as terminal — no transitions out", () => {
      expect(isTerminal("paid")).toBe(true);
      expect(isTerminal("cancelled")).toBe(true);
      expect(canTransition("paid", "requested")).toBe(false);
    });
  });

  describe("assertTransition", () => {
    it("does not throw for a legal transition", () => {
      expect(() => assertTransition("requested", "accepted")).not.toThrow();
    });

    it("throws InvalidRideTransitionError for an illegal transition", () => {
      expect(() => assertTransition("requested", "completed")).toThrow(
        InvalidRideTransitionError
      );
    });

    it("error message names both states", () => {
      try {
        assertTransition("paid", "requested");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).toContain("paid");
        expect((err as Error).message).toContain("requested");
      }
    });
  });
});

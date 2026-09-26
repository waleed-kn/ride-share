-- RideShare v1 schema
-- Run this once against your Neon database to set up tables.
-- Matches the ERD in the system design doc.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('rider', 'driver')),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id       UUID NOT NULL REFERENCES users(id),
  driver_id      UUID REFERENCES users(id), -- null until matched
  status         TEXT NOT NULL DEFAULT 'requested'
                 CHECK (status IN (
                   'requested', 'accepted', 'driver_arriving',
                   'in_progress', 'completed', 'paid', 'cancelled'
                 )),
  pickup_lat     DOUBLE PRECISION NOT NULL,
  pickup_lng     DOUBLE PRECISION NOT NULL,
  dropoff_lat    DOUBLE PRECISION NOT NULL,
  dropoff_lng    DOUBLE PRECISION NOT NULL,
  fare           NUMERIC(10, 2),
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id            UUID UNIQUE NOT NULL REFERENCES rides(id),
  stripe_payment_id  TEXT,
  amount             NUMERIC(10, 2) NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'succeeded', 'failed')),
  paid_at            TIMESTAMPTZ
);

-- Fallback/history table. The *live* source of truth for an online driver's
-- position is Redis GEO (see RedisKeys.driverGeoIndex) — this table exists
-- for last-known-position persistence and historical queries, not for the
-- real-time matching path itself.
CREATE TABLE IF NOT EXISTS driver_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES users(id),
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  available   BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);

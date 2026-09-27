# RideShare

A full-stack, real-time ride-hailing platform built as a portfolio project to demonstrate distributed-systems engineering — real-time sync, geospatial matching, and state machines — on a zero-cost infrastructure stack.

Riders request rides and get matched in real time with the nearest available driver via a Redis-backed geospatial matching engine. Ride progress streams live over WebSocket. Payment is processed through Stripe in test mode.

## Status

Fully functional end-to-end locally: signup → real-time driver matching → live ride tracking → payment → ride history, for both rider and driver roles.

Not yet deployed to a public URL — currently run locally for development and demo purposes.

## Features

- Email/password auth with role-based access (rider / driver), JWT-based sessions
- Real-time ride matching using Redis geospatial queries — nearest driver offered first, automatic fallback to the next driver on decline or 15-second timeout
- Live WebSocket updates for ride status, driver location, and offer/accept/decline flow
- Full ride lifecycle state machine (requested → accepted → driver_arriving → in_progress → completed → paid), with every transition validated server-side
- Interactive map (Mapbox) for setting pickup/dropoff and tracking driver position live
- Stripe test-mode payment flow
- Ride history for both roles
- Unit-tested core logic: matching engine (distance/ranking/fare) and the ride state machine

## Stack

Frontend: Next.js, TypeScript, Tailwind CSS, Mapbox, Socket.IO client, Stripe.js
Backend: Express, TypeScript, Socket.IO, JWT auth
Database: PostgreSQL (Neon)
Geospatial / cache: Redis (Upstash)
Payments: Stripe (test mode)
Testing: Vitest

All infrastructure runs on free tiers, at zero cost.

## Why these choices

Redis handles live driver location and matching instead of Postgres, because ride-hailing needs fast radius queries against constantly-updating positions — a workload Redis's GEO commands are built for, while Postgres holds permanent records (users, completed rides, payments) that don't need that kind of write throughput.

The app is one Next.js codebase with role-based views (rider/driver) rather than two separate apps, since this is scoped for demonstrating the engineering, not running an actual multi-team production service — this avoided duplicating auth, WebSocket setup, and layout logic for no real benefit at this scale.

## Architecture

The Next.js frontend talks to the Express backend over REST for auth and CRUD operations, and over WebSocket (Socket.IO) for real-time events. The backend reads and writes to Postgres for persistent records, to Redis for live driver locations and matching, to Mapbox for geocoding and map rendering, and to Stripe for payment processing.

## Database schema

Four tables: `users` (both roles, distinguished by a role column), `rides` (the core entity, tracking status and coordinates through its lifecycle), `payments` (one per completed ride), and `driver_locations` (a Postgres-side history/fallback table — the live source of truth for an online driver's position is Redis, not this table).

## API overview

Auth: POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me

Rides: POST /api/rides, GET /api/rides/:id, GET /api/rides/history, POST /api/rides/:id/accept, POST /api/rides/:id/decline, POST /api/rides/:id/status, POST /api/rides/:id/cancel, POST /api/rides/:id/pay

Driver: POST /api/driver/online, POST /api/driver/offline

WebSocket events: driver:location_update (client to server), and ride:requested, ride:accepted, ride:declined, ride:status_changed, driver:position, ride:cancelled (server to client)

## Local development

Backend:
cd backend
npm install
cp .env.example .env — fill in your Neon, Upstash, Stripe, and Mapbox credentials
Run the SQL in src/db/schema.sql against your Neon database
npm run check:db — verify Postgres connection
npm run check:redis — verify Redis connection
npm run dev — starts on http://localhost:4000

Frontend:
cd frontend
npm install
Create .env.local with NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
npm run dev — starts on http://localhost:3000

Run both at the same time. Sign up as a rider in one browser session and as a driver in a separate session (a different browser or an incognito window, since auth uses localStorage) to test the full flow.

Tests:
cd backend
npm test

## Testing the full flow

Go online as a driver. In a separate rider session, tap the map to set pickup, tap again for dropoff, and request a ride. The driver receives the offer with a live countdown and can accept. The driver then advances the ride through arrival, start, and completion. Once completed, the rider is shown a Stripe test payment form — card 4242 4242 4242 4242, any future expiry, any CVC.

## Project structure

rideshare/
  backend/ — Express + TypeScript API and WebSocket server
  frontend/ — Next.js app, role-based views for rider and driver
  docs/ — requirements and system design notes

## What's not built yet

Real address search (currently tap-to-set coordinates on the map, not text search)
Deployment to a public URL
Ratings, in-app chat, surge pricing, multi-city support — deliberately out of scope for this version

<<<<<<< Updated upstream
RideShare — Software Requirements Specification (v1)Author: WaleedRole: Full-Stack Software EngineerStatus: Approved / Base DesignTarget Environment: Zero-Cost Cloud Infrastructure (Free-Tier Stack)1. Executive Summary & Problem StatementModern ride-hailing services require high-concurrency event processing, low-latency telemetry broadcasting, deterministic lifecycle transitions, and proximity-based geospatial clustering.The RideShare Platform is an event-driven system built to demonstrate full-stack distributed patterns under realistic conditions:Geospatial indexing and sequential driver dispatch using in-memory data structures.Deterministic, server-validated state machine enforcement.Bidirectional pub/sub telemetry over WebSockets.Headless test payment settlement.2. System Architecture & TopologyPlaintext┌─────────────────────────────────────────────────────────────┐
│                   Next.js 14 Client (SPA)                   │
│         Mapbox GL JS  •  Socket.IO Client  •  Tailwind      │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST                     │ WebSocket (Full-Duplex)
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                    Node.js / Express Core                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ Auth & Validation│  │  State Machine   │  │ Dispatch  │  │
│  │  (JWT + Zod)     │  │ (Deterministic)  │  │Engine(Geo)│  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘  │
└───────────┼─────────────────────┼──────────────────┼────────┘
            │                     │                  │
            ▼                     ▼                  ▼
┌──────────────────────┐  ┌───────────────────────────────────┐
│ PostgreSQL via Prisma│  │           Upstash Redis           │
│  • Users & Profiles  │  │  • GEO Radius Index (Available)   │
│  • Rides (Persisted) │  │  • Driver Ephemeral Coordinates   │
│  • Payment Audits    │  │  • Dispatch Queue & Locks         │
└──────────────────────┘  └───────────────────────────────────┘
3. User Roles & RBAC MatrixAuthentication uses stateless JSON Web Tokens (JWT). The payload contains the identity and role claim (rider | driver), which gates both client routes and API/WebSocket events.Resource / ActionRiderDriverSystem / WorkerAuthenticate (Signup / Login)ValidatedValidatedN/AUpdate Geospatial CoordinatesDeniedValidated (Online)N/ACreate Ride RequestValidatedDeniedN/AAccept / Decline Ride OfferDeniedValidatedDeniedDispatch Match EngineDeniedDeniedAutomated EngineTransition Ride LifecycleCancel OnlyArrive / Start / CompleteTimeout CancelSettle Payment (Stripe Test)ValidatedDeniedWebhook / AutoView Past Ride AuditsSelf OnlySelf OnlyFull Read4. Architectural Decisions & Open Questions ResolvedThe design values for section 9 of the specification are formalized as follows:TypeScriptexport const DISPATCH_CONFIG = {
  SEARCH_RADIUS_METERS: 5000,          // 5.0 km radius search limit
  OFFER_TIMEOUT_SECONDS: 15,          // 15-second response window per driver
  MAX_DISPATCH_ATTEMPTS: 3,           // Up to 3 sequential driver offers
  FARE_BASE_CENTS: 250,               // $2.50 base fare
  FARE_PER_KM_CENTS: 150,             // $1.50 per kilometer
  COORDINATE_PRECISION_DECIMALS: 6    // Accurate within ~0.11 meters
} as const;
Fare Calculation Formula: Standardized linear meter-based pricing:$$\text{Fare (USD)} = 2.50 + \left(1.50 \times \frac{\text{Distance in Meters}}{1000}\right)$$Service Area Boundaries: Defined as a continuous dynamic radius of 5 km from the rider's pickup origin coordinate (SEARCH_RADIUS_METERS).5. Formal System Specifications5.1 Geospatial Dispatch Sequence EngineRider submits pickup (lat, lng) and dropoff coordinates.System queries Redis via GEORADIUSBYMEMBER / GEOSEARCH:Code snippetGEOSEARCH drivers:available FROMLONLAT <pickup_lng> <pickup_lat> BYRADIUS 5000 m ASC WITHDIST COUNT 5
Exclude drivers currently in active locks or offers.Sequential Waterfall Matching:Acquire a 15-second distributed key lock on driver:<id>:offered.Dispatch ride:offer socket event to Driver #1.If driver accepts within 15 seconds $\to$ Assign ride, update state to ACCEPTED, and remove driver from drivers:available.If driver declines or timeout expires $\to$ Release lock, blacklist Driver #1 for this ride_id, and immediately dispatch to Driver #2.If all drivers within the radius decline/timeout $\to$ Transition state to CANCELLED with reason NO_DRIVERS_AVAILABLE.5.2 Deterministic Ride State MachineTransitions are verified server-side. Unlisted or out-of-order transitions throw an IllegalStateTransitionException.Plaintext       ┌─────────────┐
       │  REQUESTED  │
       └──────┬──────┘
              │
       ┌──────▼──────┐      (Timeout / All Decline)
       │  SEARCHING  ├──────────────────────────────────┐
       └──────┬──────┘                                  │
              │ (Driver Accepts)                        │
       ┌──────▼──────┐                                  │
       │  ACCEPTED   │                                  │
       └──────┬──────┘                                  │
              │ (Driver Arrives)                        │
       ┌──────▼──────┐                                  │
       │   ARRIVED   │                                  │
       └──────┬──────┘                                  │
              │ (Trip Begins)                           │
       ┌──────▼──────┐                                  │
       │ IN_PROGRESS │                                  ▼
       └──────┬──────┘                           ┌─────────────┐
              │ (Dropoff Reached)                │  CANCELLED  │
       ┌──────▼──────┐                           └─────────────┘
       │  COMPLETED  │                                  ▲
       └──────┬──────┘                                  │
              │ (Stripe Test Succeeded)                 │
       ┌──────▼──────┐                                  │
       │    PAID     │                                  │
       └─────────────┘                                  │
              ▲                                         │
              └──────(Rider / Driver Pre-Trip Cancel)───┘
Valid State Transition RulesREQUESTED $\to$ SEARCHING, CANCELLEDSEARCHING $\to$ ACCEPTED, CANCELLEDACCEPTED $\to$ ARRIVED, CANCELLEDARRIVED $\to$ IN_PROGRESS, CANCELLEDIN_PROGRESS $\to$ COMPLETEDCOMPLETED $\to$ PAIDCANCELLED $\to$ Terminal StatePAID $\to$ Terminal State5.3 WebSocket Event Interface ContractEvent NameDirectionPayload Structuredriver:location:updateClient $\to$ Server{ lat: number, lng: number, heading?: number }ride:request:createClient $\to$ Server{ pickup: [lng, lat], dropoff: [lng, lat], fare: number }ride:offer:incomingServer $\to$ Client{ rideId: string, pickup: [lng, lat], dropoff: [lng, lat], fare: number, timeoutSec: number }ride:offer:respondClient $\to$ Server{ rideId: string, accepted: boolean }ride:status:changedServer $\to$ Client{ rideId: string, status: RideStatus, timestamp: string, driverLocation?: [lng, lat] }driver:telemetry:streamServer $\to$ Client{ rideId: string, lat: number, lng: number, etaSeconds: number }6. Database Entity Relational Model (Prisma / SQL)Code snippetenum Role {
  RIDER
  DRIVER
}

enum RideStatus {
  REQUESTED
  SEARCHING
  ACCEPTED
  ARRIVED
  IN_PROGRESS
  COMPLETED
  PAID
  CANCELLED
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          Role
  createdAt     DateTime  @default(now())
  
  ridesAsRider  Ride[]    @relation("RiderRides")
  ridesAsDriver Ride[]    @relation("DriverRides")
}

model Ride {
  id              String      @id @default(uuid())
  riderId         String
  driverId        String?
  status          RideStatus  @default(REQUESTED)
  
  pickupLat       Float
  pickupLng       Float
  pickupAddress   String
  dropoffLat      Float
  dropoffLng      Float
  dropoffAddress  String
  
  distanceMeters  Float
  fareAmountCents Int
  
  stripePaymentId String?
  cancelReason    String?
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  rider           User        @relation("RiderRides", fields: [riderId], references: [id])
  driver          User?       @relation("DriverRides", fields: [driverId], references: [id])
}
7. Scope BoundariesExplicitly In-Scope (v1 Baseline)Mapbox Geocoding API (address $\leftrightarrow$ coordinates) and Mapbox Directions API for polyline routing and static travel estimates.Real-time driver coordinate broadcasts throttled to 2-second intervals while active.Synchronous card settlement verification using Stripe Test Elements / PaymentIntents API.Monorepo deployment with client on Vercel and backend services on Railway/Render.Explicitly Out-of-Scope (Deferred to v2)Dynamic surge adjustments based on local density.Multi-stop or multi-tier trips (XL, Shared, Premium).Real-time VoIP or native chat mechanisms.In-app dispute mediation, split fares, and instant driver payout accounts.8. Definition of Done (DoD)Integration Passing: A complete dry-run succeeds end-to-end: Rider account creates a pickup request $\to$ Driver account receives incoming offer modal within $\le 2\text{s}$ $\to$ Driver accepts $\to$ Location markers sync on both screens $\to$ Ride transitions to COMPLETED $\to$ Mock checkout completes $\to$ Ride reflects under both user history pages.Automated Test Coverage:Unit test suite verifying all 8 state transitions and testing invalid transitions (e.g., REQUESTED $\to$ COMPLETED).Unit tests verifying Redis matching waterfall (success, expiration, timeout, next-driver fallback).Public Deployment: Public client deployed on Vercel communicating with backend on Render/Railway using secure environment parameters.
=======
RideShare — Requirements & Scope
Document (v1)
Author: Waleed Role: Full-stack engineer (solo) Status: Draft for review Last updated: 2026-
09-23
1. Problem Statement
Build a ride-hailing platform where riders can request rides and get matched in real time with
the nearest available driver, track the ride live on a map, and complete payment through a test
payment flow. This is a portfolio / learning project built to demonstrate real-time systems,
geospatial matching, and full-stack engineering practice — not a production business.
2. Goals
Demonstrate real-time, event-driven architecture (WebSocket)
Demonstrate geospatial matching at a basic but realistic level
Demonstrate a clean state machine for a multi-step business process
Produce a deployable, demoable, testable system — entirely on free-tier infrastructure
Produce SE artifacts (design docs, ERD, API contract, tests, README) that are portfolioworthy on their own
3. Non-Goals
This is not a production system and will not handle real payments, real users, or real drivers
This is not aiming for horizontal scale, multi-region, or high availability
4. User Roles
Role Description
Rider Requests rides, tracks driver, pays, views ride history
Role Description
Driver
Goes online/offline, accepts/declines requests, updates location, views
earnings/history
One Next.js app. Role is set at signup and stored on the user record; UI and available actions
are gated by role. JWT carries the role claim.
5. In Scope — v1
5.1 Auth
Email/password signup and login
JWT-based sessions, role claim ( rider | driver )
Protected routes based on role
5.2 Rider flow
Set pickup and dropoff location (map pin or address search via Mapbox geocoding)
Request a ride → system searches for nearest available driver
See ride status update live (searching → driver assigned → driver arriving → in progress →
completed)
See driver's live position and ETA on map during active ride
Pay via Stripe test mode after ride completion
View past rides (ride history list)
5.3 Driver flow
Toggle online/offline availability
While online, broadcast live location (periodic WebSocket emit)
Receive incoming ride requests (with rider pickup location + basic ride info)
Accept or decline a request (with a timeout — auto-expire if no response in N seconds)
Update ride status through the lifecycle (arrived, start ride, complete ride)
View ride history / basic earnings log
5.4 Matching engine
On ride request, query Redis geospatial index for available drivers within a radius of pickup
point
Offer to nearest driver first; on decline/timeout, offer to next nearest
Mark driver unavailable once they accept a ride; mark available again on completion
5.5 Ride state machine
Every transition is validated server-side (no illegal jumps)
Every transition is broadcast to both rider and driver over WebSocket
5.6 Real-time layer
WebSocket connection per active user session
Events: driver location updates, ride status changes, incoming ride request (to driver), ride
request result (to rider)
5.7 Map & location
Mapbox for map rendering, geocoding (address → coordinates), and route/ETA display
Live-updating driver marker during active ride
5.8 Payments
Stripe test mode, triggered on ride completion
No real money moves; test card numbers only
5.9 Ride history
List view for both roles: date, route, fare, status
6. Explicitly Out of Scope — v1
So this doesn't scope-creep mid-build, the following are deliberately not built in v1:
Multiple ride tiers (economy/premium/XL, etc.) — one ride type only
Ratings & reviews
In-app chat or calling between rider and driver
Surge/dynamic pricing
Scheduled or future-dated rides — on-demand only
Admin dashboard / ops tooling
Multi-city or multi-region support — single fixed service area
requested → accepted → driver_arriving → in_progress → completed → paid
↘ (timeout/decline chain)
requested → cancelled (rider cancels before acceptance)
accepted → cancelled (either party cancels before pickup)

Push notifications (browser/mobile) — in-app/WebSocket only
Refunds, disputes, or payment failure recovery flows
Real payment processing (Stripe stays in test mode permanently for this project)
Native mobile apps — responsive web only
If any of these become interesting later, they're v2+ candidates, not v1 work.
7. Non-Functional Requirements
Requirement Target
Infra cost
$0 — free tiers only (Vercel, Neon, Upstash, Mapbox, Render/Railway, Stripe
test mode)
Real-time
latency
Ride status & location updates reflected in <2s
Test coverage Unit tests on matching engine + state machine transitions
Availability
Best-effort — free-tier backend may cold-start after idle; acceptable for a
demo project
Browser support
Modern evergreen browsers (Chrome, Edge, Firefox) — no legacy support
needed
8. Success Criteria (Definition of Done for v1)
A rider can sign up, request a ride, and get matched to a driver without manual intervention
A driver can go online, receive a request, accept it, and the rider sees this update in real time
Ride progresses through the full state machine to completion with a test payment
Both roles can view their ride history
System is deployed and reachable via a public URL (not just localhost)
README documents setup, architecture, and how to run/demo it
Core matching and state machine logic have passing unit tests
9. Open Questions / Decisions Needed Before Design Phase
Fixed service area radius (e.g., how far do we search for drivers?)
Decline/timeout duration for driver ride offers
Whether ride fare is a flat/simple formula (distance-based) or hardcoded for v1
>>>>>>> Stashed changes

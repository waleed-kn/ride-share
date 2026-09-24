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

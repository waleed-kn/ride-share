export function RouteHero() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
      viewBox="0 0 800 600"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        id="route-path"
        d="M -50 480 C 150 480, 180 180, 340 180 S 560 420, 650 300 S 780 80, 900 80"
        stroke="#262A33"
        strokeWidth="2"
        fill="none"
      />
      <circle r="5" fill="#3D5AFE">
        <animateMotion
          dur="9s"
          repeatCount="indefinite"
          rotate="auto"
          path="M -50 480 C 150 480, 180 180, 340 180 S 560 420, 650 300 S 780 80, 900 80"
        />
      </circle>
      <circle cx="-50" cy="480" r="4" fill="#2ECC71" />
      <circle cx="900" cy="80" r="4" fill="#F7F7F5" fillOpacity="0.6" />
    </svg>
  );
}

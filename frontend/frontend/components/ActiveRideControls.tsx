import { RideStatus } from "@/lib/types";

interface NextAction {
  label: string;
  nextStatus: RideStatus;
}

const NEXT_ACTION: Partial<Record<RideStatus, NextAction>> = {
  accepted: { label: "I've arrived", nextStatus: "driver_arriving" },
  driver_arriving: { label: "Start ride", nextStatus: "in_progress" },
  in_progress: { label: "Complete ride", nextStatus: "completed" },
};

interface ActiveRideControlsProps {
  status: RideStatus;
  fare: number | null;
  onAdvance: (nextStatus: RideStatus) => void;
  advancing: boolean;
}

export function ActiveRideControls({ status, fare, onAdvance, advancing }: ActiveRideControlsProps) {
  const action = NEXT_ACTION[status];

  if (status === "completed" || status === "paid") {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="text-[17px] font-semibold text-fog">Ride complete</p>
        {fare != null && <p className="text-[13px] text-fog-dim">Fare: ${Number(fare).toFixed(2)}</p>}
      </div>
    );
  }

  if (!action) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-indigo" />
        <span className="text-[15px] font-medium text-fog capitalize">
          {status.replace("_", " ")}
        </span>
      </div>
      <button
        onClick={() => onAdvance(action.nextStatus)}
        disabled={advancing}
        className="rounded-full bg-indigo py-3 text-[15px] font-medium text-fog transition-colors hover:bg-indigo-dim disabled:opacity-50"
      >
        {advancing ? "Updating…" : action.label}
      </button>
    </div>
  );
}

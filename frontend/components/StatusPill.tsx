import { RideStatus } from "@/lib/types";

const STATUS_LABELS: Record<RideStatus, string> = {
  requested: "Finding your driver…",
  accepted: "Driver is on the way",
  driver_arriving: "Driver is arriving",
  in_progress: "On your way",
  completed: "Ride complete",
  paid: "Paid",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<RideStatus, string> = {
  requested: "text-warn",
  accepted: "text-confirm",
  driver_arriving: "text-confirm",
  in_progress: "text-indigo",
  completed: "text-fog",
  paid: "text-fog-dim",
  cancelled: "text-fog-dim",
};

export function StatusPill({ status }: { status: RideStatus }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full bg-current ${STATUS_COLORS[status]}`} />
      <span className={`text-[15px] font-medium ${STATUS_COLORS[status]}`}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

import { UserRole } from "@/lib/types";

interface RoleToggleProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

export function RoleToggle({ value, onChange }: RoleToggleProps) {
  return (
    <div className="flex rounded-xl border border-line bg-night-raised p-1">
      {(["rider", "driver"] as const).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`flex-1 rounded-lg py-2.5 text-[14px] font-medium capitalize transition-colors ${
            value === role
              ? "bg-indigo text-fog"
              : "text-fog-dim hover:text-fog"
          }`}
        >
          {role === "rider" ? "I need a ride" : "I want to drive"}
        </button>
      ))}
    </div>
  );
}

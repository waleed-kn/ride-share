interface OnlineToggleProps {
  online: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function OnlineToggle({ online, onChange, disabled }: OnlineToggleProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-2xl border border-line bg-night-raised px-5 py-4 transition-colors disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${online ? "bg-confirm" : "bg-fog-dim"}`}
        />
        <span className="text-[15px] font-medium text-fog">
          {online ? "You're online" : "You're offline"}
        </span>
      </div>
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${
          online ? "bg-confirm" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-fog transition-transform ${
            online ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

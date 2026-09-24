import { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-fog-dim">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="rounded-xl border border-line bg-night-raised px-4 py-3 text-[15px] text-fog placeholder:text-fog-dim/50 outline-none transition-colors focus:border-indigo"
      />
    </div>
  );
}

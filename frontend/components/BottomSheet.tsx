import { ReactNode } from "react";

export function BottomSheet({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t border-line bg-night-raised/95 px-5 pb-6 pt-5 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
      <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
      {children}
    </div>
  );
}

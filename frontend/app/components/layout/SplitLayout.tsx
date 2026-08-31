"use client";

import { ReactNode } from "react";

export function SplitLayout({
  chat,
  backstage,
}: {
  chat: ReactNode;
  backstage: ReactNode;
}) {
  return (
    <div className="flex h-screen w-full flex-col lg:flex-row">
      <section className="relative flex h-[55vh] min-h-0 flex-col border-b border-border bg-background lg:h-full lg:w-[60%] lg:border-b-0 lg:border-r">
        {chat}
      </section>
      <section className="relative flex min-h-0 flex-1 flex-col bg-[var(--panel-bg)] lg:w-[40%]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #9fe870 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{backstage}</div>
      </section>
    </div>
  );
}

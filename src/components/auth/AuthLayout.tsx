"use client";
import * as React from "react";

export default function AuthLayout({
  title = "",
  description = "",
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Background (optional: swap for your own) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: `url(/auth-background.png)` }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center">
        {(title || description) && (
          <div className="mb-6 text-center text-white">
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="mt-1 text-white/80">{description}</p>}
          </div>
        )}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

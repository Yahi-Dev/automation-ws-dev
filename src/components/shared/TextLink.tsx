"use client";
import Link from "next/link";
import * as React from "react";

export default function TextLink({ href, className = "text-primary hover:underline", children, prefetch }: { href: string; className?: string; children: React.ReactNode; prefetch?: boolean }) {
  return (
    <Link href={href} prefetch={prefetch} className={className}>
      {children}
    </Link>
  );
}
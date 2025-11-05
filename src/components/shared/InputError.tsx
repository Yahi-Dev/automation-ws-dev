"use client";
import * as React from "react";

export default function InputError({ message, className = "" }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return <p className={`text-sm text-red-500 ${className}`}>{message}</p>;
}

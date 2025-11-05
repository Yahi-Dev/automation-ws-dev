// src/features/dashboard/services/dashboard-service.ts

import { DashboardData } from "../types";


export async function getDashboardData(): Promise<{ success: boolean; data?: DashboardData; message: string }> {
  try {
    const response = await fetch("/api/dashboard", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
}
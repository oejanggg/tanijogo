"use client";

import { useAuth } from "./auth-context";

/**
 * Provides current authenticated user or null (allowing guest/demo mode access).
 */
export function useProtected() {
  const { user, loading } = useAuth();
  return { user, loading };
}

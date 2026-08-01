import { useAuth } from "@/contexts/auth-context";
import { usePractice } from "@/contexts/practice-context";

/**
 * Returns the effective vertical for the current user.
 * Works for demo accounts, real practice_admin, and super_admin with a selected practice.
 */
export function useVertical(): "dental" | "automotive" | "salon" | string {
  const { isDemo, demoVertical } = useAuth();
  const { myPractice } = usePractice();
  if (isDemo) return demoVertical ?? "dental";
  return myPractice?.vertical ?? "dental";
}

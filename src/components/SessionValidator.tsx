"use client";

import { useProfile } from "@/hooks/useProfile";
import { useSessionValidator } from "@/hooks/useSessionValidator";

export function SessionValidator() {
  const { user } = useProfile();
  
  // Validate session every 2 minutes for active users
  useSessionValidator(user, 120000);
  
  // This component doesn't render anything
  return null;
} 
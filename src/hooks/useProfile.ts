import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useProfile() {
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("Error getting session:", error);
          setIsLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error in getSession:", error);
        setIsLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }

      // Handle sign out specifically
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("Attempting to fetch profile for user:", userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("Profile fetch result:", { data, error });

      if (error) {
        console.error("Profile fetch error details:", error);
        throw error;
      }

      setProfile(data);
      console.log("Profile set successfully:", data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = profile?.role === "admin";
  const isStaff = profile?.role === "staff";

  return {
    profile,
    user,
    isLoading,
    isAdmin,
    isStaff,
  };
}

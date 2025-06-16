import { createClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          first_surname: string;
          second_surname: string | null;
          email: string;
          dni: string | null;
          phone: string | null;
          birth_date: string | null;
          gender: "male" | "female" | "other" | null;
          role: "admin" | "staff" | "user";
          status: "active" | "suspended" | "pending";
          health_conditions: string | null;
          emergency_contact: string | null;
          emergency_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          first_surname: string;
          second_surname?: string | null;
          email: string;
          dni?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          gender?: "male" | "female" | "other" | null;
          role?: "admin" | "staff" | "user";
          status?: "active" | "suspended" | "pending";
          health_conditions?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          first_surname?: string;
          second_surname?: string | null;
          email?: string;
          dni?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          gender?: "male" | "female" | "other" | null;
          role?: "admin" | "staff" | "user";
          status?: "active" | "suspended" | "pending";
          health_conditions?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: "Muay Thai" | "MMA";
          description: string | null;
          schedule: string;
          capacity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: "Muay Thai" | "MMA";
          description?: string | null;
          schedule: string;
          capacity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: "Muay Thai" | "MMA";
          description?: string | null;
          schedule?: string;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      class_enrollments: {
        Row: {
          id: string;
          user_id: string;
          class_id: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_id: string;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          class_id?: string;
          enrolled_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          amount: number;
          concept: string;
          payment_method: "Efectivo" | "Bizum" | "Transferencia";
          status: "pending" | "completed" | "failed";
          payment_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          amount: number;
          concept: string;
          payment_method?: "Efectivo" | "Bizum" | "Transferencia";
          status?: "pending" | "completed" | "failed";
          payment_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          amount?: number;
          concept?: string;
          payment_method?: "Efectivo" | "Bizum" | "Transferencia";
          status?: "pending" | "completed" | "failed";
          payment_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

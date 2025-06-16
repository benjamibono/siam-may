import { createClient } from "@supabase/supabase-js";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          first_surname: string;
          second_surname: string;
          dni: string;
          phone: string;
          role: "admin" | "staff" | "user";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          first_surname: string;
          second_surname: string;
          dni: string;
          phone: string;
          role?: "admin" | "staff" | "user";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          first_surname?: string;
          second_surname?: string;
          dni?: string;
          phone?: string;
          role?: "admin" | "staff" | "user";
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
          frequency: string;
          capacity: number;
          current_enrollments: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: "Muay Thai" | "MMA";
          description?: string | null;
          schedule: string;
          frequency: string;
          capacity: number;
          current_enrollments?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: "Muay Thai" | "MMA";
          description?: string | null;
          schedule?: string;
          frequency?: string;
          capacity?: number;
          current_enrollments?: number;
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
          full_name: string;
          concept:
            | "Cuota mensual Muay Thai"
            | "Cuota mensual MMA"
            | "Cuota mensual Muay Thai + MMA"
            | "Matrícula";
          amount: number;
          payment_method: "Efectivo" | "Bizum" | "Transferencia";
          payment_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          concept:
            | "Cuota mensual Muay Thai"
            | "Cuota mensual MMA"
            | "Cuota mensual Muay Thai + MMA"
            | "Matrícula";
          amount?: number;
          payment_method?: "Efectivo" | "Bizum" | "Transferencia";
          payment_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          concept?:
            | "Cuota mensual Muay Thai"
            | "Cuota mensual MMA"
            | "Cuota mensual Muay Thai + MMA"
            | "Matrícula";
          amount?: number;
          payment_method?: "Efectivo" | "Bizum" | "Transferencia";
          payment_date?: string;
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
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

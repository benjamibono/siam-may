"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Users, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  const { isAdmin, isStaff, user } = useProfile();
  const router = useRouter();

  // Solo mostrar navegación si el usuario está logueado
  if (!user) return null;

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("No hay una sesión activa para cerrar");
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.removeItem("supabase.auth.token");
      }

      toast.success("Sesión cerrada correctamente");
      router.push("/");
    } catch {
      toast.error("Error al cerrar sesión");
    }
  };

  // Función para renderizar el icono de gym
  const GymIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
    <Image
      src="/gym.png"
      alt="Gym"
      width={24}
      height={24}
      className={className}
    />
  );

  // Determinar qué links mostrar según el rol
  const getNavigationItems = () => {
    const baseItems = [];

    if (isAdmin || isStaff) {
      baseItems.push(
        { href: "/users", icon: Users, label: "Usuarios", key: "users" },
        {
          href: "/classmanagement",
          icon: GymIcon,
          label: "Gestión Clases",
          key: "classes",
        },
        {
          href: "/payments",
          icon: CreditCard,
          label: "Pagos",
          key: "payments",
        },
        { href: "/user", icon: User, label: "Mi Perfil", key: "profile" }
      );
    } else {
      baseItems.push(
        {
          href: "/userclasses",
          icon: GymIcon,
          label: "Clases",
          key: "classes",
        },
        { href: "/user", icon: User, label: "Mi Perfil", key: "profile" }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="flex items-center h-16">
        {/* Navegación para móvil - iconos alineados */}
        <div className="w-full px-4 lg:hidden">
          <div className="flex items-center justify-evenly">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center justify-center p-2 rounded-lg transition-colors",
                  pathname === item.href
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-6 w-6" />
              </Link>
            ))}

            {/* Botón de logout móvil */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-lg transition-colors text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Navegación para desktop */}
        <div className="hidden lg:flex w-full px-6">
          <div className="flex items-center space-x-1 max-w-7xl mx-auto w-full">
            {/* Links de navegación */}
            <div className="flex space-x-1 flex-1 justify-evenly">
              {navigationItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* Botón de logout */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

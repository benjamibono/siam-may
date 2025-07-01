"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Shield, User, CircleCheck, CircleX, CircleDollarSign } from "lucide-react";
import type { Tables } from "@/lib/supabase";

export default function UsersPage() {
  const { user, isLoading, isAdmin, isStaff } = useProfile();
  const router = useRouter();
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "active" | "pending" | "suspended"
  >("all");

  const fetchUsers = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast.error("No autorizado");
        router.push("/");
        return;
      }

      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes permisos para acceder a esta página");
          router.push("/");
          return;
        }
        throw new Error("Error al cargar usuarios");
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (error: unknown) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar los usuarios");
    } finally {
      setLoadingUsers(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoading) {
      if (!user || (!isAdmin && !isStaff)) {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [user, isAdmin, isStaff, isLoading, router, fetchUsers]);

  // Filtrar usuarios excluyendo el usuario actual
  const usersExcludingCurrent = users.filter((u) => u.id !== user?.id);

  // Contar usuarios por status
  const totalUsers = usersExcludingCurrent.length;
  const activeUsers = usersExcludingCurrent.filter(
    (u) => u.status === "active"
  ).length;
  const pendingUsers = usersExcludingCurrent.filter(
    (u) => u.status === "pending"
  ).length;
  const suspendedUsers = usersExcludingCurrent.filter(
    (u) => u.status === "suspended"
  ).length;

  // Filtrar por búsqueda y tipo
  let filteredUsers = usersExcludingCurrent.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.second_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.dni?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  //Ordenar por tipo de usuario y orden alfabético
  filteredUsers.sort((a, b) => {
    if (a.role === b.role) {
      return a.name?.localeCompare(b.name || "") || 0;
    }
    return a.role.localeCompare(b.role || "") || 0;
  });
  // Aplicar filtro por tipo
  if (filterType !== "all") {
    filteredUsers = filteredUsers.filter((u) => u.status === filterType);
  }

  // Ordenar usuarios según el filtro activo
  filteredUsers.sort((a, b) => {
    if (filterType === "all") return 0;
    if (
      filterType === "active" &&
      a.status === "active" &&
      b.status !== "active"
    )
      return -1;
    if (
      filterType === "active" &&
      a.status !== "active" &&
      b.status === "active"
    )
      return 1;
    if (
      filterType === "pending" &&
      a.status === "pending" &&
      b.status !== "pending"
    )
      return -1;
    if (
      filterType === "pending" &&
      a.status !== "pending" &&
      b.status === "pending"
    )
      return 1;
    if (
      filterType === "suspended" &&
      a.status === "suspended" &&
      b.status !== "suspended"
    )
      return -1;
    if (
      filterType === "suspended" &&
      a.status !== "suspended" &&
      b.status === "suspended"
    )
      return 1;
    return 0;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 md:h-6 md:w-6 text-red-600" />;
      case "staff":
        return <User className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />;
      default:
        return <User className="h-4 w-4 md:h-6 md:w-6 text-gray-600" />;
    }
  };


  if (isLoading || loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user || (!isAdmin && !isStaff)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-6xl mx-auto px-2">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => setFilterType("all")}
            className={`p-2 rounded-lg transition-all ${
              filterType === "all" ? "bg-blue-50 ring-2 ring-blue-500" : "bg-white hover:bg-gray-50"
            }`}
          >
            <User className="h-4 w-4 md:h-6 md:w-6 text-gray-600 mx-auto mb-1" />
            <div className="text-lg font-semibold">{totalUsers}</div>
          </button>

          <button
            onClick={() => setFilterType("active")}
            className={`p-2 rounded-lg transition-all ${
              filterType === "active" ? "bg-green-50 ring-2 ring-green-500" : "bg-white hover:bg-gray-50"
            }`}
          >
            <CircleCheck className="h-4 w-4 md:h-6 md:w-6 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-semibold">{activeUsers}</div>
          </button>

          <button
            onClick={() => setFilterType("pending")}
            className={`p-2 rounded-lg transition-all ${
              filterType === "pending" ? "bg-yellow-50 ring-2 ring-yellow-500" : "bg-white hover:bg-gray-50"
            }`}
          >
            <CircleDollarSign className="h-4 w-4 md:h-6 md:w-6 text-yellow-600 mx-auto mb-1" />
            <div className="text-lg font-semibold">{pendingUsers}</div>
          </button>

          <button
            onClick={() => setFilterType("suspended")}
            className={`p-2 rounded-lg transition-all ${
              filterType === "suspended" ? "bg-red-50 ring-2 ring-red-500" : "bg-white hover:bg-gray-50"
            }`}
          >
            <CircleX className="h-4 w-4 md:h-6 md:w-6 text-red-600 mx-auto mb-1" />
            <div className="text-lg font-semibold">{suspendedUsers}</div>
          </button>
        </div>

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuarios con mayor separación */}
        <div className="flex flex-col gap-2">
          {filteredUsers.map((userItem) => (
            <Link key={userItem.id} href={`/user/${userItem.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer hover:shadow-md">
                <CardContent className="py-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      {getRoleIcon(userItem.role)}
                      <h3 className="font-semibold text-lg">
                        {userItem.name && userItem.first_surname
                          ? `${userItem.name} ${userItem.first_surname} ${
                              userItem.second_surname || ""
                            }`
                          : userItem.email}
                      </h3>
                      <span className="text-sm text-gray-600">
                        {userItem.status === "active" ? (
                          <CircleCheck className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                        ) : userItem.status === "pending" ? (
                          <CircleDollarSign className="h-4 w-4 md:h-6 md:w-6 text-yellow-600" />
                        ) : (
                          <CircleX className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No se encontraron usuarios con ese criterio"
                  : "No hay usuarios registrados aún."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

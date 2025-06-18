"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Shield, User } from "lucide-react";
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

  useEffect(() => {
    if (!isLoading) {
      if (!user || (!isAdmin && !isStaff)) {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [user, isAdmin, isStaff, isLoading, router]);

  const fetchUsers = async () => {
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
  };

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
        return <Shield className="h-4 w-4 text-red-600" />;
      case "staff":
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "staff":
        return "Staff";
      default:
        return "Usuario";
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
        {/* Cards estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              filterType === "all"
                ? "ring-2 ring-blue-500 bg-blue-50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setFilterType("all")}
          >
            <CardContent className="text-center">
              <div className="text-xl font-bold text-gray-800">
                {totalUsers}
              </div>
              <div className="text-sm text-gray-600">Total Usuarios</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              filterType === "active"
                ? "ring-2 ring-green-500 bg-green-50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setFilterType("active")}
          >
            <CardContent className="text-center">
              <div className="text-xl font-bold text-green-600">
                {activeUsers}
              </div>
              <div className="text-sm text-gray-600">Activos</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              filterType === "pending"
                ? "ring-2 ring-yellow-500 bg-yellow-50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setFilterType("pending")}
          >
            <CardContent className="text-center">
              <div className="text-xl font-bold text-yellow-600">
                {pendingUsers}
              </div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              filterType === "suspended"
                ? "ring-2 ring-red-500 bg-red-50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setFilterType("suspended")}
          >
            <CardContent className="text-center">
              <div className="text-xl font-bold text-red-600">
                {suspendedUsers}
              </div>
              <div className="text-sm text-gray-600">Suspendidos</div>
            </CardContent>
          </Card>
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
                    {/* Primera línea: icono y nombre completo */}
                    <div className="flex items-center gap-2">
                      {getRoleIcon(userItem.role)}
                      <h3 className="font-semibold text-lg">
                        {userItem.name && userItem.first_surname
                          ? `${userItem.name} ${userItem.first_surname} ${
                              userItem.second_surname || ""
                            }`
                          : userItem.email}
                      </h3>
                    </div>

                    {/* Segunda línea: role y status */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          userItem.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : userItem.role === "staff"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getRoleText(userItem.role)}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          userItem.status === "active"
                            ? "bg-green-100 text-green-800"
                            : userItem.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {userItem.status === "active"
                          ? "Activo"
                          : userItem.status === "pending"
                          ? "Pendiente de Pago"
                          : "Suspendido"}
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

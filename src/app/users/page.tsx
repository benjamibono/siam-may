"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Shield, User } from "lucide-react";
import type { Tables } from "@/lib/supabase";

export default function UsersPage() {
  const { user, isLoading, isAdmin } = useProfile();
  const router = useRouter();
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isLoading) {
      if (!user || !isAdmin) {
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [user, isAdmin, isLoading, router]);

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

  const filteredUsers = users.filter(
    (u) =>
      u.id !== user?.id && // Excluir el usuario actual
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.first_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.second_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.dni?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        return "Entrenador";
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

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-row justify-between mb-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4" />
              Volver
              </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Usuarios
          </h1>
        </div>
          <div className="flex flex-row justify-between">
            <p className="text-gray-600 mt-2">
              Total de usuarios: {users.filter((u) => u.id !== user?.id).length}
            </p>
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
        <div className="flex flex-col gap-6">
          {filteredUsers.map((userItem) => (
            <Link key={userItem.id} href={`/user/${userItem.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer hover:shadow-md">
                <CardContent className="py-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {getRoleIcon(userItem.role)}
                        <h3 className="font-semibold text-lg">
                          {userItem.name && userItem.first_surname
                            ? `${userItem.name} ${userItem.first_surname} ${
                                userItem.second_surname || ""
                              }`
                            : userItem.email}
                        </h3>
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
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Email:</span>{" "}
                          {userItem.email}
                        </div>
                        {userItem.dni && (
                          <div>
                            <span className="font-medium">DNI:</span>{" "}
                            {userItem.dni}
                          </div>
                        )}
                        {userItem.phone && (
                          <div>
                            <span className="font-medium">Teléfono:</span>{" "}
                            {userItem.phone}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Registrado:</span>{" "}
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
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

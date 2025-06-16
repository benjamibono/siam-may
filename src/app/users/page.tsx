"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Search,
  Edit,
  Trash,
  Shield,
  User,
} from "lucide-react";
import type { Tables } from "@/lib/supabase";

export default function UsersPage() {
  const { user, profile, isLoading, isAdmin } = useProfile();
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<Tables<"profiles"> | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    first_surname: "",
    second_surname: "",
    dni: "",
    phone: "",
    role: "user" as "admin" | "staff" | "user",
  });

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar los usuarios");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEdit = (userToEdit: Tables<"profiles">) => {
    setFormData({
      name: userToEdit.name || "",
      first_surname: userToEdit.first_surname || "",
      second_surname: userToEdit.second_surname || "",
      dni: userToEdit.dni || "",
      phone: userToEdit.phone || "",
      role: userToEdit.role,
    });
    setEditingUser(userToEdit);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingUser.id);

      if (error) throw error;
      toast.success("Usuario actualizado correctamente");
      setIsEditing(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar el usuario");
    }
  };

  const handleDelete = async (userId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
      toast.success("Usuario eliminado correctamente");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar el usuario");
    }
  };

  const cancelEdit = () => {
    setFormData({
      name: "",
      first_surname: "",
      second_surname: "",
      dni: "",
      phone: "",
      role: "user",
    });
    setIsEditing(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.second_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.dni?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-red-600" />;
      case "staff":
        return <Users className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "staff":
        return "Personal";
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
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-2">
            Total de usuarios: {users.length}
          </p>
        </div>

        {/* Búsqueda */}
        {!isEditing && (
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
        )}

        {/* Formulario de edición */}
        {isEditing && editingUser && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Editar Usuario: {editingUser.email}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="first_surname"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Primer Apellido
                    </label>
                    <input
                      type="text"
                      id="first_surname"
                      value={formData.first_surname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          first_surname: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="second_surname"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Segundo Apellido
                    </label>
                    <input
                      type="text"
                      id="second_surname"
                      value={formData.second_surname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          second_surname: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="dni"
                      className="block text-sm font-medium text-gray-700"
                    >
                      DNI
                    </label>
                    <input
                      type="text"
                      id="dni"
                      value={formData.dni}
                      onChange={(e) =>
                        setFormData({ ...formData, dni: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="role"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Rol
                    </label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as typeof formData.role,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="user">Usuario</option>
                      <option value="staff">Personal</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Actualizar Usuario</Button>
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de usuarios */}
        <div className="space-y-4">
          {filteredUsers.map((userItem) => (
            <Card key={userItem.id}>
              <CardContent className="py-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
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
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(userItem)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(userItem.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={userItem.id === user.id} // No permitir eliminar su propio usuario
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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

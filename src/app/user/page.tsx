"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Tables } from "@/lib/supabase";

export default function UserProfilePage() {
  const { user, profile, isLoading } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    first_surname: "",
    second_surname: "",
    dni: "",
    phone: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        first_surname: profile.first_surname || "",
        second_surname: profile.second_surname || "",
        dni: profile.dni || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email!,
        ...formData,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("Perfil actualizado correctamente");
      setIsEditing(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error desconocido al actualizar el perfil");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Debes iniciar sesión para ver tu perfil</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <p className="text-gray-900">
                    {profile?.name || "No especificado"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Primer Apellido
                  </label>
                  <p className="text-gray-900">
                    {profile?.first_surname || "No especificado"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Segundo Apellido
                  </label>
                  <p className="text-gray-900">
                    {profile?.second_surname || "No especificado"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    DNI
                  </label>
                  <p className="text-gray-900">
                    {profile?.dni || "No especificado"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <p className="text-gray-900">
                    {profile?.phone || "No especificado"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rol
                  </label>
                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {profile?.role === "admin"
                      ? "Administrador"
                      : profile?.role === "staff"
                      ? "Personal"
                      : "Usuario"}
                  </span>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  Editar Perfil
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-gray-900 text-sm">
                    {user.email} (no editable)
                  </p>
                </div>
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
                <div className="flex gap-2">
                  <Button type="submit">Guardar Cambios</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

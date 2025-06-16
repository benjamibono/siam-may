"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export function AuthForm() {
  const { user } = useProfile();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileData, setProfileData] = useState({
    name: "",
    first_surname: "",
    second_surname: "",
    dni: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  // Si el usuario ya está logueado, no mostrar el formulario
  if (user) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Verificar si la cuenta está suspendida
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", data.user.id)
            .single();

          if (profile?.status === "suspended") {
            await supabase.auth.signOut();
            toast.error("Cuenta suspendida. Contacte con el administrador.");
            return;
          }
        }

        toast.success("¡Bienvenido!");
      } else {
        // Validar campos requeridos para registro
        if (
          !profileData.name ||
          !profileData.first_surname ||
          !profileData.dni ||
          !profileData.phone
        ) {
          toast.error("Por favor completa todos los campos obligatorios");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Si el usuario se creó exitosamente, actualizar el perfil
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              name: profileData.name,
              first_surname: profileData.first_surname,
              second_surname: profileData.second_surname,
              dni: profileData.dni,
              phone: profileData.phone,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.user.id);

          if (profileError) {
            console.error("Error updating profile:", profileError);
            toast.error("Usuario creado pero error al actualizar perfil");
          } else {
            toast.success(
              "¡Cuenta creada exitosamente! Puedes iniciar sesión."
            );
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error de autenticación");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-center">
            {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
              >
                Contraseña *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {/* Campos adicionales para registro */}
            {!isLogin && (
              <>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-1"
                  >
                    Nombre *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label
                    htmlFor="first_surname"
                    className="block text-sm font-medium mb-1"
                  >
                    Primer Apellido *
                  </label>
                  <input
                    id="first_surname"
                    type="text"
                    value={profileData.first_surname}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        first_surname: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu primer apellido"
                  />
                </div>
                <div>
                  <label
                    htmlFor="second_surname"
                    className="block text-sm font-medium mb-1"
                  >
                    Segundo Apellido
                  </label>
                  <input
                    id="second_surname"
                    type="text"
                    value={profileData.second_surname}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        second_surname: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu segundo apellido"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dni"
                    className="block text-sm font-medium mb-1"
                  >
                    DNI *
                  </label>
                  <input
                    id="dni"
                    type="text"
                    value={profileData.dni}
                    onChange={(e) =>
                      setProfileData({ ...profileData, dni: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345678X"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium mb-1"
                  >
                    Teléfono *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="666123456"
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Cargando..."
                : isLogin
                ? "Iniciar Sesión"
                : "Crear Cuenta"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isLogin
                ? "¿No tienes cuenta? Crear una"
                : "¿Ya tienes cuenta? Iniciar sesión"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

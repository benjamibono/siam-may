
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileData, setProfileData] = useState({
    name: "",
    first_surname: "",
    second_surname: "",
    dni: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { handleLogin } = await import("@/lib/enrollment-api");
        const result = await handleLogin(email, password);

        if (result.success) {
          // Usar el login tradicional de Supabase como fallback
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
          toast.error(result.error || "Error de autenticación");
          return;
        }
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
          options: {
            data: {
              name: profileData.name,
              first_surname: profileData.first_surname,
              second_surname: profileData.second_surname,
              dni: profileData.dni,
              phone: profileData.phone,
            },
          },
        });

        if (error) {
          // Manejar errores específicos de Supabase
          if (error.message.includes("User already registered")) {
            toast.error("Este email ya está registrado. Intenta iniciar sesión.");
          } else if (error.message.includes("Password should be at least")) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
          } else if (error.message.includes("Invalid email")) {
            toast.error("El formato del email no es válido.");
          } else {
            toast.error(`Error de registro: ${error.message}`);
          }
          return;
        }

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
              status: "pending",
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.user.id);

          if (profileError) {
            console.error("Profile update error:", profileError);
            toast.error("Usuario creado pero error al actualizar perfil. Contacta al administrador.");
          } else {
            toast.success("¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.");
            // Reset form
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setProfileData({
              name: "",
              first_surname: "",
              second_surname: "",
              dni: "",
              phone: "",
            });
          }
        } else {
          toast.error("Error inesperado al crear la cuenta. Inténtalo de nuevo.");
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

  const handleForgotPassword = async () => {
    try {
      const targetEmail = email || window.prompt("Introduce tu email para restablecer la contraseña:") || "";
      if (!targetEmail) return;

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "Hemos enviado un correo con las instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada y spam."
      );
    } catch (error: unknown) {
      console.error("Forgot-password error:", error);
      toast.error("No se pudo enviar el email de recuperación");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-[95vh] overflow-y-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 relative">
              <Image
                src="/MMA2.webp"
                alt="Siam May Logo"
                fill
                className="object-contain rounded-2xl"
              />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            {isLogin ? "Iniciar Sesión" : "Crea Tu Cuenta"}
          </h1>

          {/* Subtítulo con enlace */}
          <p className="text-center text-gray-600 mb-8">
            {isLogin ? (
              <>
                ¿No tienes una cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Regístrate aquí
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Inicia sesión aquí
                </button>
              </>
            )}
          </p>

          {/* Formulario */}
          <form onSubmit={handleAuth} className="space-y-6">
            {isLogin ? (
              // Formulario de Login
              <>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Ingresa tu email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Ingresa tu contraseña"
                  />
                  <div className="text-right mt-2">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={handleForgotPassword}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Formulario de Registro
              <>
                <h1 className="text-xl font-bold text-center text-gray-900 mb-2">
                  Todos los campos son obligatorios
                </h1>
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Ingresa tu email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Contraseña
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Ingresa tu contraseña"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Confirmar contraseña"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nombre
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Ingresa tu nombre"
                  />
                </div>
                {/* Campos adicionales para registro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="first_surname"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Primer Apellido
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Apellido"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="second_surname"
                      className="block text-sm font-medium text-gray-700 mb-2"
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="dni"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      DNI
                    </label>
                    <input
                      id="dni"
                      type="text"
                      value={profileData.dni}
                      onChange={(e) =>
                        setProfileData({ ...profileData, dni: e.target.value })
                      }
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="12345678X"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="666123456"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Botón de acción */}
            <Button
              type="submit"
              className="w-full py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
              disabled={loading}
            >
              {loading
                ? "Cargando..."
                : isLogin
                ? "Iniciar sesión"
                : "Crear Cuenta y Empezar"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

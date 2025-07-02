"use client";

import { CreditCard, User, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserClassesContent } from "@/components/UserClassesContent";
import { Announcements } from "@/components/Announcements";

export default function HomePage() {
  const { profile, isLoading, isAdmin, isStaff, user } = useProfile();
  const router = useRouter();

  useEffect(() => {
    // Si el usuario está logueado, redirigir según su rol
    if (user && profile && !isLoading) {
      if (isAdmin || isStaff) {
        router.push("/users");
      } else {
        router.push("/userclasses");
      }
    }
  }, [user, profile, isAdmin, isStaff, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Si el usuario está logueado, mostrar loading mientras redirige
  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthForm />

      {user && (
        <>
            {/* Para usuarios normales */}
            {profile?.role === 'user' && (
              <div className="space-y-12">
                {/* Anuncios */}
                <Announcements />
                
                {/* Contenido de clases directamente */}
                <UserClassesContent />

                {/* Card de Mi Perfil */}
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Mi Cuenta
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Mi Perfil
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-6">
                          Gestiona tu información personal
                        </p>
                        <Link href="/user">
                          <Button className="w-full">Ver Perfil</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Para admin */}
            {(isAdmin || isStaff) && (
              <div className="max-w-6xl mx-auto">
                {/* Anuncios para admin/staff también */}
                <div className="mb-8">
                  <Announcements />
                </div>
                
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Panel de Administración
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gestión de Usuarios
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-6">
                        Administra todos los usuarios
                      </p>
                      <Link href="/users">
                        <Button className="w-full">Gestionar Usuarios</Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <Image
                          src="/Gym.png"
                          alt="Gym"
                          width={30}
                          height={30}
                        />
                        Gestión de Clases
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-6">
                        Administra las clases del gimnasio
                      </p>
                      <Link href="/classmanagement">
                        <Button className="w-full">Gestionar Clases</Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Gestión de Pagos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-6">
                        Administra los pagos y cuotas
                      </p>
                      <Link href="/payments">
                        <Button className="w-full">Gestionar Pagos</Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Mi Perfil
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-6">
                        Gestiona tu información personal
                      </p>
                      <Link href="/user">
                        <Button className="w-full">Ver Perfil</Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}

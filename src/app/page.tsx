"use client";

import { BookOpen, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserInfo } from "@/components/auth/UserInfo";

export default function HomePage() {
  const { profile, isLoading, isAdmin, isStaff, user } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthForm />

      {user && (
        <>
          <UserInfo />
          {/* Dashboard principal */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Bienvenido a Siam May
              </h1>
              <p className="text-gray-600">Gimnasio Muay Thai & MMA</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Navegación para usuarios */}
              <Card>
                <CardHeader>
                  <CardTitle>Mis Clases</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Ve tus clases inscritas y horarios
                  </p>
                  <Link href="/userclasses">
                    <Button className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Ver Mis Clases
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mi Perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Gestiona tu información personal
                  </p>
                  <Link href="/user">
                    <Button className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Navegación para staff y admin */}
              {(isAdmin || isStaff) && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Gestión de Clases</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Administra las clases del gimnasio
                      </p>
                      <Link href="/classmanagement">
                        <Button className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Gestionar Clases
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Gestión de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Administra los pagos y cuotas
                      </p>
                      <Link href="/payments">
                        <Button className="w-full">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Gestionar Pagos
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Navegación solo para admin */}
              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Administra todos los usuarios
                    </p>
                    <Link href="/users">
                      <Button className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        Gestionar Usuarios
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

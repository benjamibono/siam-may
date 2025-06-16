"use client";

import { BookOpen, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserInfo } from "@/components/auth/UserInfo";
import { UserClassesContent } from "@/components/UserClassesContent";

export default function HomePage() {
  const { profile, isLoading, isAdmin, isStaff, user } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
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
            {profile?.role !== "admin" && (
            <div className="mb-12">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Bienvenido a Siam May
              </h1>
              <p className="text-lg text-gray-600">Gimnasio Muay Thai & MMA</p>
            </div>
            )}
            {/* Para usuarios normales */}
            {profile?.role !== "admin" && profile?.role !== "staff" && (
              <div className="space-y-12">
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
                          <Users className="h-5 w-5" />
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

            {/* Para staff */}
            {isStaff && !isAdmin && (
              <div className="space-y-12">
                {/* Contenido de clases directamente */}
                <UserClassesContent />

                {/* Cards de gestión y perfil */}
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Herramientas de Gestión
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
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
                          <Users className="h-5 w-5" />
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
            {isAdmin && (
              <div className="max-w-6xl mx-auto">
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
                        <BookOpen className="h-5 w-5" />
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
                        <Users className="h-5 w-5" />
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
          </div>
        </>
      )}
    </div>
  );
}

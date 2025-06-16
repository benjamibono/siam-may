"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, Users } from "lucide-react";
import type { Tables } from "@/lib/supabase";

interface ClassWithEnrollment extends Tables<"classes"> {
  is_enrolled: boolean;
}

export default function UserClassesPage() {
  const { user, profile, isLoading } = useProfile();
  const [classes, setClasses] = useState<ClassWithEnrollment[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;

    try {
      // Obtener todas las clases
      const { data: allClasses, error: classesError } = await supabase
        .from("classes")
        .select("*");

      if (classesError) throw classesError;

      // Obtener las inscripciones del usuario
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("user_id", user.id);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledClassIds = enrollments?.map((e) => e.class_id) || [];

      // Combinar la información
      const classesWithEnrollment: ClassWithEnrollment[] =
        allClasses?.map((cls) => ({
          ...cls,
          is_enrolled: enrolledClassIds.includes(cls.id),
        })) || [];

      setClasses(classesWithEnrollment);
    } catch (error: any) {
      console.error("Error fetching classes:", error);
      toast.error("Error al cargar las clases");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEnrollment = async (classId: string, isEnrolled: boolean) => {
    if (!user) return;

    try {
      if (isEnrolled) {
        // Desinscribirse
        const { error } = await supabase
          .from("class_enrollments")
          .delete()
          .eq("user_id", user.id)
          .eq("class_id", classId);

        if (error) throw error;
        toast.success("Te has desinscrito de la clase");
      } else {
        // Inscribirse
        const { error } = await supabase.from("class_enrollments").insert({
          user_id: user.id,
          class_id: classId,
        });

        if (error) throw error;
        toast.success("Te has inscrito a la clase");
      }

      // Actualizar la lista
      fetchClasses();
    } catch (error: any) {
      console.error("Error with enrollment:", error);
      toast.error("Error al procesar la inscripción");
    }
  };

  if (isLoading || loadingClasses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Debes iniciar sesión para ver tus clases</div>
      </div>
    );
  }

  const enrolledClasses = classes.filter((cls) => cls.is_enrolled);
  const availableClasses = classes.filter((cls) => !cls.is_enrolled);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Mis Clases</h1>
        </div>

        <div className="grid gap-8">
          {/* Clases Inscritas */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Clases en las que estás inscrito
            </h2>
            {enrolledClasses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No estás inscrito en ninguna clase aún.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {enrolledClasses.map((cls) => (
                  <Card key={cls.id} className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {cls.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cls.description && (
                        <p className="text-gray-600">{cls.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {cls.schedule} - {cls.frequency}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        {cls.current_enrollments}/{cls.capacity} inscritos
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleEnrollment(cls.id, true)}
                        className="w-full"
                      >
                        Desinscribirse
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Clases Disponibles */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Clases disponibles
            </h2>
            {availableClasses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">
                    No hay clases disponibles para inscribirse.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableClasses.map((cls) => (
                  <Card key={cls.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {cls.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cls.description && (
                        <p className="text-gray-600">{cls.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {cls.schedule} - {cls.frequency}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        {cls.current_enrollments}/{cls.capacity} inscritos
                      </div>
                      <Button
                        onClick={() => handleEnrollment(cls.id, false)}
                        className="w-full"
                        disabled={cls.current_enrollments >= cls.capacity}
                      >
                        {cls.current_enrollments >= cls.capacity
                          ? "Clase Llena"
                          : "Inscribirse"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

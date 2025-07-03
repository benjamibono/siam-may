"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import Image from "next/image";
import {
  canEnrollInClasses,
  getEnrollmentStatusMessage,
  canEnrollInClassType,
  getClassRestrictionMessage,
} from "@/lib/payment-logic";
import { 
  parseSchedule, 
  formatClassDaysForUser,
  formatDaysForManagement,
  canEnrollInClass 
} from "@/lib/utils";

interface ClassWithEnrollment {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  capacity: number;
  created_at: string;
  updated_at: string;
  is_enrolled: boolean;
  enrollment_count: number;
}

// Función para obtener el icono apropiado según el tipo de clase
const getClassIcon = (className: string, description?: string) => {
  // Primero verificar condiciones de descripción
  if (description && description.toLowerCase().includes("bjj")) {
    return { src: "/lock.png", alt: "BJJ" };
  }
  if (description && description.toLowerCase().includes("sparring")) {
    return { src: "/opponent.png", alt: "Sparring" };
  }
  // Luego verificar nombre de clase
  if (className === "Muay Thai") {
    return { src: "/shield.png", alt: "Muay Thai" };
  }
  if (className === "MMA") {
    return { src: "/gym.png", alt: "MMA" };
  }
  // Icono por defecto
  return { src: "/gym.png", alt: "Clase" };
};

export function UserClassesContent() {
  const { user, profile, isLoading } = useProfile();
  const [classes, setClasses] = useState<ClassWithEnrollment[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    canEnroll: boolean;
    message: string;
  }>({ canEnroll: false, message: "" });

  const checkEnrollmentStatus = useCallback(async () => {
    if (!user || !profile) return;

    try {
      const canEnroll = await canEnrollInClasses(user.id);
      const message = await getEnrollmentStatusMessage(user.id);

      setEnrollmentStatus({
        canEnroll,
        message,
      });
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      setEnrollmentStatus({
        canEnroll: false,
        message: "Error al verificar el estado de inscripción",
      });
    }
  }, [user, profile]);

  const fetchClasses = useCallback(async () => {
    if (!user) return;

    try {
      // Obtener todas las clases y las inscripciones del usuario en paralelo
      const [classesResult, enrollmentsResult, allEnrollmentsResult] =
        await Promise.all([
          supabase.from("classes").select("*"),
          supabase
            .from("class_enrollments")
            .select("class_id")
            .eq("user_id", user.id),
          supabase.from("class_enrollments").select("class_id"),
        ]);

      if (classesResult.error) throw classesResult.error;
      if (enrollmentsResult.error) throw enrollmentsResult.error;
      if (allEnrollmentsResult.error) throw allEnrollmentsResult.error;

      const enrolledClassIds =
        enrollmentsResult.data?.map((e) => e.class_id) || [];

      // Contar inscripciones por clase de forma eficiente
      const enrollmentCounts =
        allEnrollmentsResult.data?.reduce((acc, enrollment) => {
          acc[enrollment.class_id] = (acc[enrollment.class_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      // Crear el array final con toda la información
      const classesWithEnrollment: ClassWithEnrollment[] = (
        classesResult.data || []
      ).map((cls) => ({
        ...cls,
        is_enrolled: enrolledClassIds.includes(cls.id),
        enrollment_count: enrollmentCounts[cls.id] || 0,
      }));

      setClasses(classesWithEnrollment);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Error al cargar las clases");
    } finally {
      setLoadingClasses(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && profile) {
      fetchClasses();
      checkEnrollmentStatus();
    }
  }, [user, profile, fetchClasses, checkEnrollmentStatus]);

  const handleEnrollment = async (classId: string, isEnrolled: boolean) => {
    if (!user || !profile) return;

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
        // Verificar si puede inscribirse en general
        if (!enrollmentStatus.canEnroll) {
          toast.error(enrollmentStatus.message);
          return;
        }

        // Obtener información de la clase para verificar restricciones específicas
        const classInfo = classes.find((cls) => cls.id === classId);
        if (!classInfo) {
          toast.error("Clase no encontrada");
          return;
        }

        // Verificar si puede inscribirse en este tipo de clase específicamente
        const canEnrollInType = await canEnrollInClassType(
          user.id,
          classInfo.name
        );
        if (!canEnrollInType) {
          const restrictionMessage = await getClassRestrictionMessage(
            user.id,
            classInfo.name
          );
          toast.error(restrictionMessage);
          return;
        }

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
    } catch (error) {
      console.error("Error handling enrollment:", error);
      toast.error("Error al procesar la inscripción");
    }
  };

  if (isLoading || loadingClasses) {
    return (
      <div className="flex items-center justify-center p-8">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div>Debes iniciar sesión para ver tus clases</div>
      </div>
    );
  }

  const enrolledClasses = classes.filter((cls) => cls.is_enrolled);
  const availableClasses = classes.filter((cls) => !cls.is_enrolled);

  return (
    <div className="space-y-8">
      {/* Estado de inscripción */}
      {!enrollmentStatus.canEnroll && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">{enrollmentStatus.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clases Inscritas */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Mis Clases
          {enrolledClasses.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {enrolledClasses.length}
            </Badge>
          )}
        </h2>

        {enrolledClasses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Image
                src="/sport.png"
                alt="Sport"
                width={64}
                height={64}
                className="mx-auto mb-4 opacity-50"
              />
              <p className="text-gray-500 text-lg">
                No estás inscrito en ninguna clase aún.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Explora las clases disponibles abajo para comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrolledClasses.map((cls) => {
              const parsed = parseSchedule(cls.schedule);
              const icon = getClassIcon(cls.name, cls.description || undefined);
              
              return (
                <Card key={cls.id} className="border-green-200 bg-green-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-3">
                        <Image
                          src={icon.src}
                          alt={icon.alt}
                          width={32}
                          height={32}
                        />
                        <span>{cls.name}</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Inscrito
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {cls.description && (
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {cls.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatDaysForManagement(parsed.days)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {formatClassDaysForUser(parsed.days, parsed.start, parsed.end)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {cls.enrollment_count}/{cls.capacity} inscritos
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handleEnrollment(cls.id, true)}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      Desinscribirse
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Clases Disponibles */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Clases Disponibles
          {availableClasses.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {availableClasses.length}
            </Badge>
          )}
        </h2>

        {availableClasses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Image
                src="/gym.png"
                alt="Gym"
                width={64}
                height={64}
                className="mx-auto mb-4 opacity-50"
              />
              <p className="text-gray-500 text-lg">
                No hay clases disponibles en este momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableClasses.map((cls) => {
              const parsed = parseSchedule(cls.schedule);
              const icon = getClassIcon(cls.name, cls.description || undefined);
              const isClassFull = cls.enrollment_count >= cls.capacity;
              const canEnroll = canEnrollInClass(parsed.days, parsed.start);
              
              return (
                <Card key={cls.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-3">
                        <Image
                          src={icon.src}
                          alt={icon.alt}
                          width={32}
                          height={32}
                        />
                        <span>{cls.name}</span>
                      </div>
                      {isClassFull && (
                        <Badge variant="destructive" className="text-xs">
                          Llena
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {cls.description && (
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {cls.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatDaysForManagement(parsed.days)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {formatClassDaysForUser(parsed.days, parsed.start, parsed.end)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {cls.enrollment_count}/{cls.capacity} inscritos
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleEnrollment(cls.id, false)}
                      className="w-full"
                      disabled={!enrollmentStatus.canEnroll || isClassFull || !canEnroll}
                    >
                      {isClassFull
                        ? "Clase Llena"
                        : !canEnroll
                        ? "Clase Empezada"
                        : !enrollmentStatus.canEnroll
                        ? "No disponible"
                        : "Inscribirse"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Users, Clock } from "lucide-react";
import Image from "next/image";
import type { Tables } from "@/lib/supabase";
import {
  canEnrollInClasses,
  // getEnrollmentStatusMessage, // Unused import
  canEnrollInClassType,
  // getClassRestrictionMessage, // Unused import
  getCurrentMonthYear,
} from "@/lib/payment-logic";

interface ClassWithEnrollment extends Tables<"classes"> {
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

// Función para parsear el horario de clases
const parseSchedule = (schedule: string) => {
  if (!schedule) return { days: [], start: "", end: "" };

  // Intentar parsear el formato "Lunes, Miércoles 19:00-20:30"
  const match = schedule.match(/^(.+?)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (match) {
    const [, daysStr, start, end] = match;
    const days = daysStr.split(/,\s*(?:y\s+)?/);
    return { days, start, end };
  }

  return { days: [], start: "", end: "" };
};

export function UserClassesContent() {
  const { user, profile } = useProfile();
  const [classes, setClasses] = useState<ClassWithEnrollment[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [lastPayment, setLastPayment] = useState<{
    concept: string;
    payment_date: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      fetchClasses();
      fetchLastPayment();
    }
  }, [user]);

  const fetchLastPayment = async () => {
    if (!user) return;

    try {
      const { month, year } = getCurrentMonthYear();
      const { data: payments, error } = await supabase
        .from("payments")
        .select("concept, payment_date")
        .eq("user_id", user.id)
        .gte("payment_date", `${year}-${month.toString().padStart(2, "0")}-01`)
        .lt(
          "payment_date",
          `${year}-${(month + 1).toString().padStart(2, "0")}-01`
        )
        .order("payment_date", { ascending: false })
        .limit(1);

      if (error) throw error;

      setLastPayment(payments && payments.length > 0 ? payments[0] : null);
    } catch {
      // Handle error silently
    }
  };

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

      // Obtener el conteo de inscripciones para cada clase
      const classesWithEnrollment: ClassWithEnrollment[] = [];

      if (allClasses) {
        for (const cls of allClasses) {
          const { count, error: countError } = await supabase
            .from("class_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", cls.id);

          if (countError) {
            // Handle error silently
          }

          classesWithEnrollment.push({
            ...cls,
            is_enrolled: enrolledClassIds.includes(cls.id),
            enrollment_count: count || 0,
          });
        }
      }

      setClasses(classesWithEnrollment);
    } catch {
      toast.error("Error al cargar las clases");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEnrollment = async (
    classId: string,
    isEnrolled: boolean,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _className: string
  ) => {
    if (!user || !profile) return;

    const { handleEnrollment: handleEnrollmentApi } = await import(
      "@/lib/enrollment-api"
    );

    try {
      const action = isEnrolled ? "unenroll" : "enroll";
      const result = await handleEnrollmentApi(action, classId);

      if (result.success) {
        toast.success(
          result.message ||
            (isEnrolled
              ? "Te has desinscrito de la clase"
              : "Te has inscrito a la clase")
        );
        // Actualizar la lista
        fetchClasses();
      } else {
        toast.error(result.error || "Error al procesar la inscripción");
      }
    } catch (error) {
      console.error("Error al procesar inscripción:", error);
      toast.error("Error al procesar la inscripción");
    }
  };

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Cargando clases...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const enrolledClasses = classes.filter((cls) => cls.is_enrolled);
  const availableClasses = classes.filter((cls) => !cls.is_enrolled);

  return (
    <div className="space-y-12">
      {/* Estado del Usuario */}
      {/* {profile && (
        <div className="max-w-4xl mx-auto mb-4">
          <p className="text-sm text-gray-700">
            Estado:{" "}
            <span className="font-medium">
              {profile.status === "active" ? "Activo" : "Pendiente"}
            </span>
          </p>
        </div>
      )} */}

      {/* Clases Inscritas */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Clases en las que estás inscrito
        </h2>
        {enrolledClasses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <Image
                src="/gym.png"
                alt="Gym"
                width={30}
                height={30}
                className="mx-auto mb-4"
              />
              <p className="text-lg text-gray-500">
                No estás inscrito en ninguna clase aún.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {enrolledClasses.map((cls) => (
              <Card
                key={cls.id}
                className="border-green-200 bg-green-50 hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {(() => {
                      const icon = getClassIcon(
                        cls.name,
                        cls.description || undefined
                      );
                      return (
                        <Image
                          src={icon.src}
                          alt={icon.alt}
                          width={30}
                          height={30}
                        />
                      );
                    })()}
                    {cls.name}
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
                        {(() => {
                          const parsed = parseSchedule(cls.schedule);
                          return parsed.days.length > 0
                            ? parsed.days.join(", ")
                            : "Sin días definidos";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {(() => {
                          const parsed = parseSchedule(cls.schedule);
                          return parsed.start && parsed.end
                            ? `${parsed.start} - ${parsed.end}`
                            : "Sin horario definido";
                        })()}
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
                    onClick={() => handleEnrollment(cls.id, true, cls.name)}
                    className="w-full mt-4"
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
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Clases disponibles
        </h2>
        {availableClasses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-lg text-gray-500">
                No hay clases disponibles para inscribirse.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableClasses.map((cls) => (
              <Card key={cls.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {(() => {
                      const icon = getClassIcon(
                        cls.name,
                        cls.description || undefined
                      );
                      return (
                        <Image
                          src={icon.src}
                          alt={icon.alt}
                          width={30}
                          height={30}
                        />
                      );
                    })()}
                    {cls.name}
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
                        {(() => {
                          const parsed = parseSchedule(cls.schedule);
                          return parsed.days.length > 0
                            ? parsed.days.join(", ")
                            : "Sin días definidos";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {(() => {
                          const parsed = parseSchedule(cls.schedule);
                          return parsed.start && parsed.end
                            ? `${parsed.start} - ${parsed.end}`
                            : "Sin horario definido";
                        })()}
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
                    onClick={() => handleEnrollment(cls.id, false, cls.name)}
                    className="w-full mt-4"
                    disabled={
                      cls.enrollment_count >= cls.capacity ||
                      !canEnrollInClasses(profile?.status || "") ||
                      !canEnrollInClassType(
                        cls.name,
                        lastPayment?.concept || null
                      )
                    }
                  >
                    {cls.enrollment_count >= cls.capacity
                      ? "Clase Llena"
                      : !canEnrollInClasses(profile?.status || "")
                      ? "No disponible"
                      : !canEnrollInClassType(
                          cls.name,
                          lastPayment?.concept || null
                        )
                      ? "Cuota no válida"
                      : "Inscribirse"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

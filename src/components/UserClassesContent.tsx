"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, Calendar, Users, AlertCircle } from "lucide-react";
import type { Tables } from "@/lib/supabase";
import {
  canEnrollInClasses,
  getEnrollmentStatusMessage,
  canEnrollInClassType,
  getClassRestrictionMessage,
  getCurrentMonthYear,
} from "@/lib/payment-logic";

interface ClassWithEnrollment extends Tables<"classes"> {
  is_enrolled: boolean;
  enrollment_count: number;
}

// Helper function to format schedule
const formatSchedule = (schedule: string, isEnrolled: boolean = false) => {
  if (!schedule) return "";

  // Extract days and time from schedule (assuming format like "Lunes, Miércoles, Viernes 19:00-20:00")
  const timeRegex = /\d{1,2}:\d{2}-\d{1,2}:\d{2}/;
  const timeMatch = schedule.match(timeRegex);
  const time = timeMatch ? timeMatch[0] : "";

  // Get the days part (everything before the time)
  const daysText = schedule.replace(timeRegex, "").trim().replace(/,$/, "");

  if (isEnrolled) {
    // For enrolled classes, show "Próximo [día]" or "Hoy" or "Mañana"
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    // Simple logic to determine next class day
    const dayMappings: { [key: string]: number } = {
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
      Sábado: 6,
      Domingo: 0,
    };

    // Find if today is a class day
    const todayName = dayNames[today];
    const tomorrowName = dayNames[(today + 1) % 7]; // Handle Sunday case
    if (daysText.includes(todayName)) {
      return `Hoy ${time}`;
    } else if (daysText.includes(tomorrowName)) {
      return `Mañana ${time}`;
    }

    // Find next class day
    const classDays = Object.keys(dayMappings).filter((day) =>
      daysText.includes(day)
    );
    let nextDay = "";
    let minDiff = 8; // More than a week

    classDays.forEach((day) => {
      const dayNum = dayMappings[day];
      let diff = dayNum - today;
      if (diff <= 0) diff += 7; // Next week
      if (diff < minDiff) {
        minDiff = diff;
        nextDay = day;
      }
    });

    return `Próximo ${nextDay} ${time}`;
  } else {
    // For available classes, replace last comma with "y"
    const formattedDays = daysText.replace(/,([^,]*)$/, " y$1");
    return `${formattedDays} ${time}`;
  }
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
    } catch (error) {
      console.error("Error fetching last payment:", error);
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
            console.error("Error counting enrollments:", countError);
          }

          classesWithEnrollment.push({
            ...cls,
            is_enrolled: enrolledClassIds.includes(cls.id),
            enrollment_count: count || 0,
          });
        }
      }

      setClasses(classesWithEnrollment);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Error al cargar las clases");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEnrollment = async (
    classId: string,
    isEnrolled: boolean,
    className: string
  ) => {
    if (!user || !profile) return;

    try {
      if (isEnrolled) {
        // Desinscribirse (siempre permitido)
        const { error } = await supabase
          .from("class_enrollments")
          .delete()
          .eq("user_id", user.id)
          .eq("class_id", classId);

        if (error) throw error;
        toast.success("Te has desinscrito de la clase");
      } else {
        // Verificar si puede inscribirse según el estado
        if (!canEnrollInClasses(profile.status)) {
          const message = getEnrollmentStatusMessage(profile.status);
          toast.error(message);
          return;
        }

        // Verificar si puede inscribirse según el tipo de pago
        if (!canEnrollInClassType(className, lastPayment?.concept || null)) {
          const message = getClassRestrictionMessage(
            className,
            lastPayment?.concept || null
          );
          toast.error(message);
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
      console.error("Error with enrollment:", error);
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
      {profile && (
        <div className="max-w-4xl mx-auto mb-4">
          <p className="text-sm text-gray-700">
            Estado:{" "}
            <span className="font-medium">
              {profile.status === "active" ? "Activo" : "Pendiente"}
            </span>
          </p>
        </div>
      )}

      {/* Clases Inscritas */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Clases en las que estás inscrito
        </h2>
        {enrolledClasses.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-6" />
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
                    <BookOpen className="h-5 w-5" />
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
                        {formatSchedule(cls.schedule, true)}
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
                    <BookOpen className="h-5 w-5" />
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
                        {formatSchedule(cls.schedule, false)}
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

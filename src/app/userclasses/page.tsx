"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { Users, Clock, ChevronDown, ChevronRight } from "lucide-react";
import type { Tables } from "@/lib/supabase";
import { getCurrentMonthYear } from "@/lib/payment-logic";
import { parseSchedule, formatClassDaysForUser } from "@/lib/utils";

interface ClassWithEnrollment extends Tables<"classes"> {
  is_enrolled: boolean;
  enrollment_count: number;
}

interface AnnouncementWithProfile extends Tables<"announcements"> {
  profiles?: {
    name: string;
    first_surname: string;
    second_surname: string | null;
  } | null;
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

export default function UserClassesPage() {
  const { user, profile, isLoading } = useProfile();
  const [classes, setClasses] = useState<ClassWithEnrollment[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [, setLastPayment] = useState<{
    concept: string;
    payment_date: string;
  } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementWithProfile[]>(
    []
  );
  const filterOptions = [
    { id: "MMA", label: "MMA" },
    { id: "Muay Thai", label: "Thai" },
    { id: "Mañana", label: "Mañana" },
    { id: "Tarde", label: "Tarde" },
    { id: "Niños", label: "Niños" },
  ];

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/announcements");
      const announcementsData = await response.json();
      setAnnouncements(announcementsData);
    } catch {
      toast.error("Error al obtener los anuncios");
    }
  };
  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  };

  const isTimeInRange = (timeStr: string, range: "morning" | "afternoon") => {
    if (!timeStr) return false;
    const [hours] = timeStr.split(":").map(Number);
    if (range === "morning") {
      return hours >= 0 && hours < 14;
    } else {
      return hours >= 14 && hours < 24;
    }
  };

  const sortClasses = (classes: ClassWithEnrollment[]) => {
    return classes.sort((a, b) => {
      // Primero ordenar por nombre
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison !== 0) return nameComparison;

      // Si tienen el mismo nombre, ordenar por hora de inicio
      const parsedA = parseSchedule(a.schedule);
      const parsedB = parseSchedule(b.schedule);

      if (!parsedA.start && !parsedB.start) return 0;
      if (!parsedA.start) return 1;
      if (!parsedB.start) return -1;

      return parsedA.start.localeCompare(parsedB.start);
    });
  };

  const filterClasses = (classes: ClassWithEnrollment[]) => {
    if (activeFilters.length === 0) return sortClasses(classes);

    const filtered = classes.filter((classItem) => {
      const parsed = parseSchedule(classItem.schedule);

      return activeFilters.every((filter) => {
        switch (filter) {
          case "MMA":
            return classItem.name.toLowerCase().includes("mma");
          case "Muay Thai":
            return classItem.name.toLowerCase().includes("muay thai");
          case "Mañana":
            return isTimeInRange(parsed.start, "morning");
          case "Tarde":
            return isTimeInRange(parsed.start, "afternoon");
          case "Niños":
            return (
              classItem.name.toLowerCase().includes("niños") ||
              (classItem.description &&
                classItem.description.toLowerCase().includes("niños"))
            );
          default:
            return true;
        }
      });
    });

    return sortClasses(filtered);
  };

  const toggleDescription = (classId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (user) {
      fetchClasses();
      fetchLastPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Removed console.error and unused error variable
    }
  };

  const fetchClasses = async () => {
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
    } catch {
      // Removed console.error and unused error variable
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

  const renderClassCard = (cls: ClassWithEnrollment, isEnrolled: boolean) => {
    const parsed = parseSchedule(cls.schedule);
    const icon = getClassIcon(cls.name, cls.description || undefined);
    const isDescriptionExpanded = expandedDescriptions.has(cls.id);

    return (
      <Card
        key={cls.id}
        className={isEnrolled ? "border-green-200 bg-green-50" : ""}
      >
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src={icon.src} alt={icon.alt} width={24} height={24} />
              <span className="text-base">{cls.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {cls.enrollment_count}/{cls.capacity}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-base font-semibold">
              <Clock className="h-4 w-4" />
              {formatClassDaysForUser(parsed.days, parsed.start, parsed.end)}
            </div>
          </div>

          {cls.description && (
            <div className="border-t pt-2">
              <button
                onClick={() => toggleDescription(cls.id)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full text-left"
              >
                {isDescriptionExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Descripción
              </button>
              {isDescriptionExpanded && (
                <p className="text-sm text-gray-600 mt-2 pl-5">
                  {cls.description}
                </p>
              )}
            </div>
          )}

          <Button
            variant={isEnrolled ? "outline" : "default"}
            onClick={() => handleEnrollment(cls.id, isEnrolled, cls.name)}
            className="w-full"
            disabled={!isEnrolled && cls.enrollment_count >= cls.capacity}
          >
            {isEnrolled
              ? "Desinscribirse"
              : cls.enrollment_count >= cls.capacity
              ? "Clase Llena"
              : "Inscribirse"}
          </Button>
        </CardContent>
      </Card>
    );
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

  // Apply filters to both enrolled and available classes
  const filteredEnrolledClasses = filterClasses(enrolledClasses);
  const filteredAvailableClasses = filterClasses(availableClasses);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Lista de anuncios existentes */}
        {announcements.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-col gap-2 justify-between">
              <h2 className="text-xl font-semibold flex justify-center text-orange-400 mb-2">
                {announcements.length > 1 ? "¡Atención a los anuncios! ⚠️" : "¡Atención al anuncio! ⚠️"}
              </h2>
              <div className="mb-4">
                <div className="grid gap-4">
                  {announcements.map((announcement) => (
                    <Card
                      key={announcement.id}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg text-balance">{announcement.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 text-pretty pb-4">
                          {announcement.content}
                        </p>
                        <div className="flex flex-row gap-2 justify-between text-xs text-gray-500">
                          Creado:{" "}
                          {new Date(announcement.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                          <span className="text-xs text-gray-500">
                            Por: {announcement.profiles?.name || "Usuario"}{" "}
                            {announcement.profiles?.first_surname || ""}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Filtros */}
        <div className="mb-6">
          <div className="flex gap-2 items-center flex-balance justify-evenly">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => toggleFilter(option.id)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  activeFilters.includes(option.id)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8">
          {/* Clases Inscritas */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Clases en las que estás inscrito
            </h2>
            {filteredEnrolledClasses.length === 0 ? (
              <Card>
                <CardContent className="py-2 text-center">
                  <Image
                    src="/sport.png"
                    alt="Sport"
                    width={30}
                    height={30}
                    className="mx-auto mb-4"
                  />
                  <p className="text-gray-500">
                    {enrolledClasses.length === 0
                      ? "No estás inscrito en ninguna clase aún."
                      : "No hay clases inscritas que coincidan con los filtros seleccionados."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredEnrolledClasses.map((cls) =>
                  renderClassCard(cls, true)
                )}
              </div>
            )}
          </div>

          {/* Clases Disponibles */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Clases disponibles
            </h2>
            {filteredAvailableClasses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Image
                    src="/gym.png"
                    alt="Gym"
                    width={30}
                    height={30}
                    className="mx-auto mb-4"
                  />
                  <p className="text-gray-500">
                    {availableClasses.length === 0
                      ? "No hay clases disponibles para inscribirse."
                      : "No hay clases disponibles que coincidan con los filtros seleccionados."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredAvailableClasses.map((cls) =>
                  renderClassCard(cls, false)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

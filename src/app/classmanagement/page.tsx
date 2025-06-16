"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Users,
  Plus,
  Edit,
  Trash,
} from "lucide-react";
import type { Tables } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClassWithEnrollments extends Tables<"classes"> {
  enrolled_users: {
    name: string;
    first_surname: string;
    second_surname: string | null;
  }[];
  enrollment_count: number;
}

// Helper function to format schedule for display
const formatClassDate = (schedule: string) => {
  if (!schedule) return "";

  // Extract days and time from schedule (assuming format like "Lunes, Miércoles, Viernes 19:00-20:00")
  const timeRegex = /\d{1,2}:\d{2}-\d{1,2}:\d{2}/;
  const timeMatch = schedule.match(timeRegex);
  const time = timeMatch ? timeMatch[0] : "";

  // Get the days part (everything before the time)
  const daysText = schedule.replace(timeRegex, "").trim().replace(/,$/, "");

  // For admin/staff view, just show "Lunes, Miércoles y Viernes 19:00-20:00"
  const formattedDays = daysText.replace(/,([^,]*)$/, " y$1");
  return `${formattedDays} ${time}`;
};

export default function ClassManagementPage() {
  const { user, isLoading, isAdmin, isStaff } = useProfile();
  const [classes, setClasses] = useState<ClassWithEnrollments[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithEnrollments | null>(
    null
  );
  const [selectedClassForEnrollments, setSelectedClassForEnrollments] =
    useState<ClassWithEnrollments | null>(null);
  const [formData, setFormData] = useState({
    name: "Muay Thai" as "Muay Thai" | "MMA",
    description: "",
    schedule: "",
    capacity: 20,
  });

  // Nuevos estados para los selectores mejorados
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const daysOfWeek = [
    { value: "Lunes", label: "Lunes" },
    { value: "Martes", label: "Martes" },
    { value: "Miércoles", label: "Miércoles" },
    { value: "Jueves", label: "Jueves" },
    { value: "Viernes", label: "Viernes" },
    { value: "Sábado", label: "Sábado" },
    { value: "Domingo", label: "Domingo" },
  ];

  // Funciones auxiliares
  const formatSchedule = (days: string[], start: string, end: string) => {
    if (days.length === 0 || !start || !end) return "";
    const daysString = days.join(", ");
    return `${daysString} ${start}-${end}`;
  };

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

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  useEffect(() => {
    if (user && (isAdmin || isStaff)) {
      fetchClasses();
    }
  }, [user, isAdmin, isStaff]);

  const fetchClasses = async () => {
    try {
      // Obtener el token de sesión
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch("/api/admin/classes", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al obtener las clases");
      }

      const classesWithEnrollments = await response.json();
      console.log("Clases obtenidas:", classesWithEnrollments);

      setClasses(classesWithEnrollments);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Error al cargar las clases");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que se hayan seleccionado días y horarios
    if (selectedDays.length === 0) {
      toast.error("Debes seleccionar al menos un día de la semana");
      return;
    }

    if (!startTime || !endTime) {
      toast.error("Debes especificar hora de inicio y fin");
      return;
    }

    if (startTime >= endTime) {
      toast.error("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    // Crear el horario formateado a partir de los selectores
    const schedule = formatSchedule(selectedDays, startTime, endTime);

    const dataToSave = {
      ...formData,
      schedule,
    };

    try {
      if (editingClass) {
        // Actualizar clase existente
        const { error } = await supabase
          .from("classes")
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingClass.id);

        if (error) throw error;
        toast.success("Clase actualizada correctamente");
      } else {
        // Crear nueva clase
        const { error } = await supabase.from("classes").insert({
          ...dataToSave,
        });

        if (error) throw error;
        toast.success("Clase creada correctamente");
      }

      // Reset form
      setFormData({
        name: "Muay Thai",
        description: "",
        schedule: "",
        capacity: 20,
      });
      setSelectedDays([]);
      setStartTime("");
      setEndTime("");
      setIsCreating(false);
      setEditingClass(null);
      fetchClasses();
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Error al guardar la clase");
    }
  };

  const handleEdit = (classItem: ClassWithEnrollments) => {
    // Parsear el horario existente
    const parsed = parseSchedule(classItem.schedule);

    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      schedule: classItem.schedule,
      capacity: classItem.capacity,
    });

    // Poblar los selectores
    setSelectedDays(parsed.days);
    setStartTime(parsed.start);
    setEndTime(parsed.end);

    setEditingClass(classItem);
    setIsCreating(true);
  };

  const handleDelete = async (classId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar esta clase? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;
      toast.success("Clase eliminada correctamente");
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Error al eliminar la clase");
    }
  };

  const cancelForm = () => {
    setFormData({
      name: "Muay Thai",
      description: "",
      schedule: "",
      capacity: 20,
    });
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
    setIsCreating(false);
    setEditingClass(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Debes iniciar sesión para acceder a esta página</div>
      </div>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Gestión de Clases
          </h1>
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Clase
            </Button>
          </div>
        </div>

        {isCreating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingClass ? "Editar Clase" : "Crear Nueva Clase"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Tipo de Clase
                  </label>
                  <select
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value as "Muay Thai" | "MMA",
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Muay Thai">Muay Thai</option>
                    <option value="MMA">MMA</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descripción de la clase..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de la semana
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                          selectedDays.includes(day.value)
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="startTime"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="endTime"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Hora de fin
                    </label>
                    <input
                      type="time"
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {selectedDays.length > 0 && startTime && endTime && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Horario:</strong>{" "}
                      {formatSchedule(selectedDays, startTime, endTime)}
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="capacity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Capacidad máxima
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="1"
                    max="50"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingClass ? "Actualizar Clase" : "Crear Clase"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de clases */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <Card key={classItem.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {classItem.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {classItem.description && (
                  <p className="text-gray-600">{classItem.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {formatClassDate(classItem.schedule)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <button
                    onClick={() => setSelectedClassForEnrollments(classItem)}
                    className="hover:underline"
                  >
                    {classItem.enrollment_count}/{classItem.capacity} inscritos
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(classItem)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(classItem.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {classes.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay clases creadas aún.</p>
            </CardContent>
          </Card>
        )}

        {/* Diálogo de participantes */}
        <Dialog
          open={!!selectedClassForEnrollments}
          onOpenChange={() => setSelectedClassForEnrollments(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Participantes de {selectedClassForEnrollments?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {selectedClassForEnrollments?.enrolled_users.map(
                (user, index) => (
                  <div key={index} className="p-2 border rounded">
                    {user.name} {user.first_surname} {user.second_surname || ""}
                  </div>
                )
              )}
              {selectedClassForEnrollments?.enrolled_users.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No hay participantes inscritos aún.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

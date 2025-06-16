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

export default function ClassManagementPage() {
  const { user, profile, isLoading, isAdmin, isStaff } = useProfile();
  const [classes, setClasses] = useState<Tables<"classes">[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingClass, setEditingClass] = useState<Tables<"classes"> | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "Muay Thai" as "Muay Thai" | "MMA",
    description: "",
    schedule: "",
    frequency: "",
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
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error("Error fetching classes:", error);
      toast.error("Error al cargar las clases");
    } finally {
      setLoadingClasses(false);
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
    const frequency = `${selectedDays.length} veces por semana`;

    const dataToSave = {
      ...formData,
      schedule,
      frequency,
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
          current_enrollments: 0,
        });

        if (error) throw error;
        toast.success("Clase creada correctamente");
      }

      // Reset form
      setFormData({
        name: "Muay Thai",
        description: "",
        schedule: "",
        frequency: "",
        capacity: 20,
      });
      setSelectedDays([]);
      setStartTime("");
      setEndTime("");
      setIsCreating(false);
      setEditingClass(null);
      fetchClasses();
    } catch (error: any) {
      console.error("Error saving class:", error);
      toast.error("Error al guardar la clase");
    }
  };

  const handleEdit = (classItem: Tables<"classes">) => {
    // Parsear el horario existente
    const parsed = parseSchedule(classItem.schedule);

    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      schedule: classItem.schedule,
      frequency: classItem.frequency,
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
    } catch (error: any) {
      console.error("Error deleting class:", error);
      toast.error("Error al eliminar la clase");
    }
  };

  const cancelForm = () => {
    setFormData({
      name: "Muay Thai",
      description: "",
      schedule: "",
      frequency: "",
      capacity: 20,
    });
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
    setIsCreating(false);
    setEditingClass(null);
  };

  if (isLoading || loadingClasses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  if (!user || (!isAdmin && !isStaff)) {
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
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Clases
            </h1>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Clase
              </Button>
            )}
          </div>
        </div>

        {/* Formulario de creación/edición */}
        {isCreating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingClass ? "Editar Clase" : "Crear Nueva Clase"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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

                {/* Selector de días de la semana */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de la semana
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {daysOfWeek.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  {selectedDays.length === 0 && (
                    <p className="text-red-500 text-sm mt-1">
                      Selecciona al menos un día
                    </p>
                  )}
                </div>

                {/* Selectores de hora */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Preview del horario */}
                {selectedDays.length > 0 && startTime && endTime && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Horario:</strong>{" "}
                      {formatSchedule(selectedDays, startTime, endTime)}
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>Frecuencia:</strong> {selectedDays.length} veces
                      por semana
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
              <CardContent className="space-y-3">
                {classItem.description && (
                  <p className="text-gray-600">{classItem.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {classItem.schedule} - {classItem.frequency}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  {classItem.current_enrollments}/{classItem.capacity} inscritos
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
      </div>
    </div>
  );
}

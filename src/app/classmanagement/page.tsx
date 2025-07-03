"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { Calendar, Users, Plus, Trash, Clock } from "lucide-react";
import type { Tables } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseSchedule,
  formatScheduleForManagement,
  formatDaysForManagement,
  sortDays,
} from "@/lib/utils";

interface ClassWithEnrollments extends Tables<"classes"> {
  enrolled_users: {
    name: string;
    first_surname: string;
    second_surname: string | null;
  }[];
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

export default function ClassManagementPage() {
  const { user, isLoading, isAdmin, isStaff } = useProfile();
  const [classes, setClasses] = useState<ClassWithEnrollments[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementWithProfile[]>(
    []
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithEnrollments | null>(
    null
  );
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<AnnouncementWithProfile | null>(null);
  const [selectedClassForEnrollments, setSelectedClassForEnrollments] =
    useState<ClassWithEnrollments | null>(null);
  const [formData, setFormData] = useState({
    name: "Muay Thai" as "Muay Thai" | "MMA",
    description: "",
    schedule: "",
    capacity: 20,
  });

  const [announcementFormData, setAnnouncementFormData] = useState({
    title: "",
    content: "",
    expires_at: "",
    has_expiration: false,
  });

  // Estados para los selectores mejorados
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [deleteAnnouncementConfirmOpen, setDeleteAnnouncementConfirmOpen] =
    useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<
    string | null
  >(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const filterOptions = [
    { id: "MMA", label: "MMA" },
    { id: "Muay Thai", label: "Muay Thai" },
    { id: "Niños", label: "Niños" },
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  };

  const sortClasses = (classes: ClassWithEnrollments[]) => {
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

  const filterClasses = (classes: ClassWithEnrollments[]) => {
    if (activeFilters.length === 0) return sortClasses(classes);

    const filtered = classes.filter((classItem) => {
      return activeFilters.every((filter) => {
        switch (filter) {
          case "MMA":
            return classItem.name.toLowerCase().includes("mma");
          case "Muay Thai":
            return classItem.name.toLowerCase().includes("muay thai");
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

  const daysOfWeek = [
    { value: "Lunes", label: "Lunes" },
    { value: "Martes", label: "Martes" },
    { value: "Miércoles", label: "Miércoles" },
    { value: "Jueves", label: "Jueves" },
    { value: "Viernes", label: "Viernes" },
    { value: "Sábado", label: "Sábado" },
    { value: "Domingo", label: "Domingo" },
  ];

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  useEffect(() => {
    if (user && (isAdmin || isStaff)) {
      fetchClasses();
      fetchAnnouncements();
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

      setClasses(classesWithEnrollments);
    } catch {
      toast.error("Error al obtener las clases");
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/announcements");

      if (!response.ok) {
        throw new Error("Error al obtener los anuncios");
      }

      const announcementsData = await response.json();
      setAnnouncements(announcementsData);
    } catch {
      toast.error("Error al obtener los anuncios");
    }
  };

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!announcementFormData.title || !announcementFormData.content) {
      toast.error("Título y contenido son requeridos");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const payload = {
        title: announcementFormData.title,
        content: announcementFormData.content,
        expires_at:
          announcementFormData.has_expiration && announcementFormData.expires_at
            ? new Date(announcementFormData.expires_at).toISOString()
            : null,
      };

      if (editingAnnouncement) {
        // Update existing announcement
        const response = await fetch("/api/announcements", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: editingAnnouncement.id,
            ...payload,
          }),
        });

        if (!response.ok) {
          throw new Error("Error al actualizar el anuncio");
        }

        toast.success("Anuncio actualizado correctamente");
      } else {
        // Create new announcement
        const response = await fetch("/api/announcements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Error al crear el anuncio");
        }

        toast.success("Anuncio creado correctamente");
      }

      // Reset form
      setAnnouncementFormData({
        title: "",
        content: "",
        expires_at: "",
        has_expiration: false,
      });
      setIsCreatingAnnouncement(false);
      setEditingAnnouncement(null);
      await fetchAnnouncements();
    } catch {
      toast.error("Error al procesar el anuncio");
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

    // Crear el horario formateado con días ordenados
    const schedule = formatScheduleForManagement(
      selectedDays,
      startTime,
      endTime
    );

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
      await fetchClasses();
    } catch {
      toast.error("Error al guardar la clase");
    }
  };

  const handleEdit = (classItem: ClassWithEnrollments) => {
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      schedule: classItem.schedule,
      capacity: classItem.capacity,
    });

    // Poblar los selectores con los valores del horario existente
    const { days, start, end } = parseSchedule(classItem.schedule);
    setSelectedDays(days);
    setStartTime(start);
    setEndTime(end);

    setEditingClass(classItem);
    setIsCreating(true);
  };

  const handleCardClick = (classItem: ClassWithEnrollments) => {
    handleEdit(classItem);
  };

  const confirmDelete = (classId: string) => {
    setClassToDelete(classId);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!classToDelete) return;

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classToDelete);

      if (error) throw error;
      toast.success("Clase eliminada exitosamente");
      await fetchClasses();
      setDeleteConfirmOpen(false);
      setClassToDelete(null);
      setIsCreating(false);
      setEditingClass(null);
    } catch {
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

  const handleEditAnnouncement = (announcement: AnnouncementWithProfile) => {
    setAnnouncementFormData({
      title: announcement.title,
      content: announcement.content,
      expires_at: announcement.expires_at
        ? new Date(announcement.expires_at).toISOString().slice(0, 16)
        : "",
      has_expiration: !!announcement.expires_at,
    });
    setEditingAnnouncement(announcement);
    setIsCreatingAnnouncement(true);
  };

  const confirmDeleteAnnouncement = (announcementId: string) => {
    setAnnouncementToDelete(announcementId);
    setDeleteAnnouncementConfirmOpen(true);
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch(
        `/api/announcements?id=${announcementToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar el anuncio");
      }

      toast.success("Anuncio eliminado correctamente");
      await fetchAnnouncements();

      // Cerrar el editor del anuncio
      setIsCreatingAnnouncement(false);
      setEditingAnnouncement(null);
      setAnnouncementFormData({
        title: "",
        content: "",
        expires_at: "",
        has_expiration: false,
      });

      // Cerrar el dialog de confirmación
      setDeleteAnnouncementConfirmOpen(false);
      setAnnouncementToDelete(null);
    } catch {
      toast.error("Error al eliminar el anuncio");
    }
  };

  const cancelAnnouncementForm = () => {
    setAnnouncementFormData({
      title: "",
      content: "",
      expires_at: "",
      has_expiration: false,
    });
    setIsCreatingAnnouncement(false);
    setEditingAnnouncement(null);
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
          <div className="flex flex-col gap-4 justify-between">
            <div className="flex flex-row gap-2 justify-evenly">
              <Button
                className="w-1/2"
                onClick={() => setIsCreatingAnnouncement(true)}
              >
                <Plus className="h-4 w-4" />
                Nuevo Anuncio
              </Button>
              <Button onClick={() => setIsCreating(true)} className="w-1/2">
                <Plus className="h-4 w-4" />
                Nueva Clase
              </Button>
            </div>
            {isCreatingAnnouncement && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {editingAnnouncement ? "Editar Anuncio" : "Crear Anuncio"}
                    {editingAnnouncement && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          confirmDeleteAnnouncement(editingAnnouncement.id)
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleSubmitAnnouncement}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Título
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={announcementFormData.title}
                        onChange={(e) =>
                          setAnnouncementFormData({
                            ...announcementFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="content"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Contenido
                      </label>
                      <textarea
                        id="content"
                        value={announcementFormData.content}
                        onChange={(e) =>
                          setAnnouncementFormData({
                            ...announcementFormData,
                            content: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="has_expiration"
                          checked={announcementFormData.has_expiration}
                          onChange={(e) =>
                            setAnnouncementFormData({
                              ...announcementFormData,
                              has_expiration: e.target.checked,
                              expires_at: e.target.checked
                                ? announcementFormData.expires_at
                                : "",
                            })
                          }
                          className="rounded"
                        />
                        <label
                          htmlFor="has_expiration"
                          className="text-sm font-medium text-gray-700"
                        >
                          Establecer fecha de caducidad
                        </label>
                      </div>
                      {announcementFormData.has_expiration && (
                        <input
                          type="datetime-local"
                          id="expires_at"
                          value={announcementFormData.expires_at}
                          onChange={(e) =>
                            setAnnouncementFormData({
                              ...announcementFormData,
                              expires_at: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">
                        {editingAnnouncement
                          ? "Actualizar Anuncio"
                          : "Crear Anuncio"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelAnnouncementForm}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            {isCreating && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {editingClass ? "Editar Clase" : "Crear Nueva Clase"}
                    {editingClass && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(editingClass.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    )}
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
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
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
                          {formatScheduleForManagement(
                            sortDays(selectedDays),
                            startTime,
                            endTime
                          )}
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelForm}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de anuncios existentes */}
            {announcements.length > 0 && (
              <div className="mb-2">
                <div className="grid gap-4">
                  {announcements.map((announcement) => (
                    <Card
                      key={announcement.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleEditAnnouncement(announcement)}
                    >
                      <CardHeader className="">
                        <CardTitle className="flex flex-col items-center justify-between">
                          <span className="text-lg text-balance">
                            {announcement.title}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 text-center text-pretty pb-4">
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
                        <div className="flex gap-2 justify-between text-xs text-orange-400">
                          {announcement.expires_at && (
                            <span>
                              Expira:{" "}
                              {new Date(
                                announcement.expires_at
                              ).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {/* Filtros */}
            <div className="flex gap-1 items-center flex-wrap justify-evenly">
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
        </div>

        {/* Lista de clases */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filterClasses(classes).map((classItem) => {
            const parsed = parseSchedule(classItem.schedule);
            const icon = getClassIcon(
              classItem.name,
              classItem.description || undefined
            );

            return (
              <Card
                key={classItem.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCardClick(classItem)}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image
                        src={icon.src}
                        alt={icon.alt}
                        width={24}
                        height={24}
                      />
                      <span className="text-base">{classItem.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {parsed.start && parsed.end
                        ? `${parsed.start} - ${parsed.end}`
                        : "Sin horario"}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDaysForManagement(parsed.days)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClassForEnrollments(classItem);
                        }}
                        className="hover:underline"
                      >
                        {classItem.enrollment_count}/{classItem.capacity}
                      </button>
                    </div>
                  </div>
                  {classItem.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {classItem.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filterClasses(classes).length === 0 && classes.length > 0 && (
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
                No hay clases que coincidan con los filtros seleccionados.
              </p>
            </CardContent>
          </Card>
        )}

        {classes.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Image
                src="/gym.png"
                alt="Gym"
                width={30}
                height={30}
                className="mx-auto mb-4"
              />
              <p className="text-gray-500">No hay clases creadas aún.</p>
            </CardContent>
          </Card>
        )}

        {/* Diálogo de confirmación de eliminación de clase */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                ¿Estás seguro de que quieres eliminar esta clase? Esta acción no
                se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación de eliminación de anuncio */}
        <Dialog
          open={deleteAnnouncementConfirmOpen}
          onOpenChange={setDeleteAnnouncementConfirmOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                ¿Estás seguro de que quieres eliminar este anuncio? Esta acción
                no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteAnnouncementConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteAnnouncement}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de participantes */}
        <Dialog
          open={!!selectedClassForEnrollments}
          onOpenChange={() => setSelectedClassForEnrollments(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center text-sm leading-normal">
                Participantes de {selectedClassForEnrollments?.name}
                <br />
                {selectedClassForEnrollments?.schedule}
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

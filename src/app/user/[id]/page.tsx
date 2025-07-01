"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CreditCard, Plus } from "lucide-react";
import type { Tables } from "@/lib/supabase";
import { isValidMedicalInsurance, getCurrentMonthYear } from "@/lib/payment-logic";

// Componente Dialog simple para reset de contraseña
const PasswordResetDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    onConfirm(password);
    setPassword("");
    setConfirmPassword("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Cambiar Contraseña</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Dialog para crear pago
const CreatePaymentDialog = ({
  isOpen,
  onClose,
  targetUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetUser: Tables<"profiles"> | null;
}) => {
  const [formData, setFormData] = useState({
    user_id: "",
    full_name: "",
    concept: "Cuota mensual Muay Thai" as
      | "Cuota mensual Muay Thai"
      | "Cuota mensual MMA"
      | "Cuota mensual Muay Thai + MMA"
      | "Matrícula"
      | "Seguro Médico",
    amount: 30,
    payment_method: "Efectivo" as "Efectivo" | "Bizum" | "Transferencia",
    payment_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (isOpen && targetUser) {
      // Pre-rellenar con datos del usuario objetivo
      setFormData((prev) => ({
        ...prev,
        user_id: targetUser.id,
        full_name: `${targetUser.name || ""} ${
          targetUser.first_surname || ""
        } ${targetUser.second_surname || ""}`.trim(),
      }));
    }
  }, [isOpen, targetUser]);

  const getConceptAmount = (concept: string) => {
    switch (concept) {
      case "Cuota mensual Muay Thai":
        return 30;
      case "Cuota mensual MMA":
        return 45;
      case "Cuota mensual Muay Thai + MMA":
        return 60;
      case "Matrícula":
        return 30;
      case "Seguro Médico":
        return 30;
      default:
        return 30;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.full_name) {
      toast.error("Datos del usuario requeridos");
      return;
    }

    try {
      const { error } = await supabase.from("payments").insert(formData);

      if (error) throw error;
      toast.success("Pago registrado correctamente");

      // Procesar automáticamente el estado del usuario después de registrar un pago
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const response = await fetch(
            `/api/payments/process-status?userId=${formData.user_id}`,
            {
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.statusChanged) {
              toast.success(
                `Estado del usuario actualizado a: ${
                  result.newStatus === "active"
                    ? "Activo"
                    : result.newStatus === "pending"
                    ? "Pendiente"
                    : "Suspendido"
                }`
              );
            }
          }
        }
      } catch (statusError) {
        console.error("Error updating user status:", statusError);
        // No mostrar error al usuario ya que el pago se registró correctamente
      }

      // Reset form y cerrar dialog
      setFormData({
        user_id: "",
        full_name: "",
        concept: "Cuota mensual Muay Thai",
        amount: 30,
        payment_method: "Efectivo",
        payment_date: new Date().toISOString().split("T")[0],
      });
      onClose();
      // Recargar la página para mostrar el nuevo pago
      window.location.reload();
    } catch (error: unknown) {
      console.error("Error saving payment:", error);
      toast.error("Error al guardar el pago");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Registrar Nuevo Pago</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={formData.full_name}
              readOnly
              className="w-full px-3 py-2 border rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto
            </label>
            <select
              value={formData.concept}
              onChange={(e) => {
                const concept = e.target.value as typeof formData.concept;
                setFormData({
                  ...formData,
                  concept,
                  amount: getConceptAmount(concept),
                });
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Cuota mensual Muay Thai">
                Cuota mensual Muay Thai
              </option>
              <option value="Cuota mensual MMA">Cuota mensual MMA</option>
              <option value="Cuota mensual Muay Thai + MMA">
                Cuota mensual Muay Thai + MMA
              </option>
              <option value="Matrícula">Matrícula</option>
              <option value="Seguro Médico">Seguro Médico</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importe (€)
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payment_method: e.target
                    .value as typeof formData.payment_method,
                })
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Bizum">Bizum</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Pago
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) =>
                setFormData({ ...formData, payment_date: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Pago</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Dialog para opciones de pago (editar/eliminar)
const PaymentOptionsDialog = ({
  isOpen,
  onClose,
  payment,
  onEdit,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  payment: Tables<"payments"> | null;
  onEdit: (payment: Tables<"payments">) => void;
  onDelete: (payment: Tables<"payments">) => void;
}) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Opciones de Pago</h3>

        {/* Información del pago */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
          <p>
            <span className="font-medium">Usuario:</span> {payment.full_name}
          </p>
          <p>
            <span className="font-medium">Concepto:</span> {payment.concept}
          </p>
          <p>
            <span className="font-medium">Importe:</span> {payment.amount}€
          </p>
          <p>
            <span className="font-medium">Método:</span>{" "}
            {payment.payment_method}
          </p>
          <p>
            <span className="font-medium">Fecha:</span>{" "}
            {new Date(payment.payment_date).toLocaleDateString()}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              onEdit(payment);
              onClose();
            }}
            className="w-full"
          >
            Editar Pago
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("¿Estás seguro de que quieres eliminar este pago?")) {
                onDelete(payment);
                onClose();
              }
            }}
            className="w-full"
          >
            Eliminar Pago
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente Dialog para editar pago
const EditPaymentDialog = ({
  isOpen,
  onClose,
  payment,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  payment: Tables<"payments"> | null;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    concept: "Cuota mensual Muay Thai" as
      | "Cuota mensual Muay Thai"
      | "Cuota mensual MMA"
      | "Cuota mensual Muay Thai + MMA"
      | "Matrícula"
      | "Seguro Médico",
    amount: 30,
    payment_method: "Efectivo" as "Efectivo" | "Bizum" | "Transferencia",
    payment_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (isOpen && payment) {
      setFormData({
        concept: payment.concept as typeof formData.concept,
        amount: payment.amount,
        payment_method:
          payment.payment_method as typeof formData.payment_method,
        payment_date: payment.payment_date,
      });
    }
  }, [isOpen, payment, formData]);

  const getConceptAmount = (concept: string) => {
    switch (concept) {
      case "Cuota mensual Muay Thai":
        return 30;
      case "Cuota mensual MMA":
        return 45;
      case "Cuota mensual Muay Thai + MMA":
        return 60;
      case "Matrícula":
        return 30;
      case "Seguro Médico":
        return 30;
      default:
        return 30;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    try {
      const { error } = await supabase
        .from("payments")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (error) throw error;
      toast.success("Pago actualizado correctamente");

      // Procesar automáticamente el estado del usuario después de actualizar un pago
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const response = await fetch(
            `/api/payments/process-status?userId=${payment.user_id}`,
            {
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.statusChanged) {
              toast.success(
                `Estado del usuario actualizado a: ${
                  result.newStatus === "active"
                    ? "Activo"
                    : result.newStatus === "pending"
                    ? "Pendiente"
                    : "Suspendido"
                }`
              );
            }
          }
        }
      } catch (statusError) {
        console.error("Error updating user status:", statusError);
      }

      onSave();
      onClose();
    } catch (error: unknown) {
      console.error("Error updating payment:", error);
      toast.error("Error al actualizar el pago");
    }
  };

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Editar Pago</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={payment.full_name}
              readOnly
              className="w-full px-3 py-2 border rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto
            </label>
            <select
              value={formData.concept}
              onChange={(e) => {
                const concept = e.target.value as typeof formData.concept;
                setFormData({
                  ...formData,
                  concept,
                  amount: getConceptAmount(concept),
                });
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Cuota mensual Muay Thai">
                Cuota mensual Muay Thai
              </option>
              <option value="Cuota mensual MMA">Cuota mensual MMA</option>
              <option value="Cuota mensual Muay Thai + MMA">
                Cuota mensual Muay Thai + MMA
              </option>
              <option value="Matrícula">Matrícula</option>
              <option value="Seguro Médico">Seguro Médico</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importe (€)
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payment_method: e.target
                    .value as typeof formData.payment_method,
                })
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Bizum">Bizum</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Pago
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) =>
                setFormData({ ...formData, payment_date: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Actualizar Pago</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Dialog para confirmar eliminación de usuario
const DeleteUserDialog = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Eliminar Usuario</h3>
        <p className="text-gray-600 mb-6">
          ¿Estás seguro de que quieres eliminar al usuario {userName}? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Eliminar Usuario
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user, isLoading, isAdmin, isStaff } = useProfile();
  const [targetUser, setTargetUser] = useState<Tables<"profiles"> | null>(null);
  const [userPayments, setUserPayments] = useState<Tables<"payments">[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCreatePaymentDialog, setShowCreatePaymentDialog] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<Tables<"payments"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    first_surname: "",
    second_surname: "",
    dni: "",
    phone: "",
    role: "user" as "admin" | "staff" | "user",
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const loadId = async () => {
      const { id } = await params;
      setId(id);
    };
    loadId();
  }, [params]);

  const fetchUserData = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast.error("No autorizado");
        router.push("/");
        return;
      }

      const response = await fetch(`/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes permisos para acceder a esta página");
          router.push("/");
          return;
        }
        throw new Error("Error al cargar datos del usuario");
      }

      const result = await response.json();
      const userData = result.user;
      const paymentsData = result.payments;

      setTargetUser(userData);
      setUserPayments(paymentsData || []);
      setFormData({
        name: userData.name || "",
        first_surname: userData.first_surname || "",
        second_surname: userData.second_surname || "",
        dni: userData.dni || "",
        phone: userData.phone || "",
        role: userData.role,
      });
    } catch (error: unknown) {
      console.error("Error fetching user:", error);
      toast.error("Error al cargar los datos del usuario");
    }
  }, [id, router]);

  useEffect(() => {
    if (!isLoading && (!user || (!isAdmin && !isStaff))) {
      router.push("/");
      return;
    }
    if (user) {
      fetchUserData();
    }
  }, [user, isAdmin, isStaff, isLoading, id, router, fetchUserData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast.error("No autorizado");
        return;
      }

      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes permisos para realizar esta acción");
          return;
        }
        throw new Error("Error al actualizar usuario");
      }

      toast.success("Perfil actualizado correctamente");
      setIsEditing(false);
      fetchUserData();
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar el usuario");
    }
  };

  // Reset de contraseña usando supabase.auth.resetPasswordForEmail para admins
  const handlePasswordReset = async () => {
    if (!targetUser) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        targetUser.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      toast.success("Email de restablecimiento de contraseña enviado");
    } catch (error: unknown) {
      console.error("Error sending reset password:", error);
      toast.error("Error al enviar el email de restablecimiento");
    }
  };

  // Cambio de email usando supabase.auth.updateUser
  const handleEmailChange = async () => {
    const newEmail = prompt("Ingresa el nuevo email para el usuario:");
    if (!newEmail || !targetUser) return;

    // Validar formato de email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Por favor ingresa un email válido");
      return;
    }

    try {
      // Si es el propio usuario, usar updateUser directamente
      if (user?.id === targetUser.id) {
        const { error } = await supabase.auth.updateUser({
          email: newEmail,
        });

        if (error) {
          throw error;
        }

        toast.success(
          "Email actualizado correctamente. Verifica tu nuevo email para confirmar el cambio."
        );
      } else {
        // Si es admin cambiando el email de otro usuario, usar la API
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          toast.error("No autorizado");
          return;
        }

        const response = await fetch(
          `/api/users/${targetUser.id}/change-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ newEmail }),
          }
        );

        if (!response.ok) {
          throw new Error("Error al cambiar email");
        }

        toast.success("Email actualizado correctamente");
      }

      fetchUserData(); // Refresh user data
    } catch (error: unknown) {
      console.error("Error changing email:", error);
      toast.error("Error al cambiar el email");
    }
  };

  // Reset de contraseña del propio usuario
  const handleOwnPasswordReset = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast.success("Contraseña actualizada correctamente");
      setShowPasswordDialog(false);
    } catch (error: unknown) {
      console.error("Error updating password:", error);
      toast.error("Error al actualizar la contraseña");
    }
  };

  const handleSuspendToggle = async () => {
    if (!targetUser) return;

    const newStatus =
      targetUser.status === "suspended" ? "active" : "suspended";
    const action = newStatus === "suspended" ? "suspender" : "activar";

    if (!confirm(`¿Estás seguro de que quieres ${action} esta cuenta?`)) {
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast.error("No autorizado");
        return;
      }

      const response = await fetch(`/api/users/${targetUser.id}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Error al ${action} cuenta`);
      }

      toast.success(
        `Cuenta ${
          newStatus === "suspended" ? "suspendida" : "activada"
        } correctamente`
      );
      fetchUserData(); // Refresh user data
    } catch (error: unknown) {
      console.error("Error toggling suspend:", error);
      toast.error(`Error al ${action} la cuenta`);
    }
  };

  const handleRoleChange = async () => {
    if (!targetUser) return;

    const newRole = targetUser.role === "staff" ? "user" : "staff";

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast.error("No autorizado");
        return;
      }

      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          role: newRole,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes permisos para realizar esta acción");
          return;
        }
        throw new Error("Error al actualizar rol del usuario");
      }

      toast.success(
        `Permisos de staff ${
          newRole === "staff" ? "otorgados" : "removidos"
        } correctamente`
      );
      fetchUserData(); // Refresh user data
    } catch (error: unknown) {
      console.error("Error updating user role:", error);
      toast.error("Error al actualizar los permisos del usuario");
    }
  };

  const handleEditPayment = (payment: Tables<"payments">) => {
    setSelectedPayment(payment);
    setShowEditPaymentDialog(true);
  };

  const handleDeletePayment = async (payment: Tables<"payments">) => {
    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", payment.id);

      if (error) throw error;

      toast.success("Pago eliminado correctamente");

      // Procesar automáticamente el estado del usuario después de eliminar un pago
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const response = await fetch(
            `/api/payments/process-status?userId=${payment.user_id}`,
            {
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.statusChanged) {
              toast.success(
                `Estado del usuario actualizado a: ${
                  result.newStatus === "active"
                    ? "Activo"
                    : result.newStatus === "pending"
                    ? "Pendiente"
                    : "Suspendido"
                }`
              );
            }
          }
        }
      } catch (statusError) {
        console.error("Error updating user status:", statusError);
      }

      fetchUserData(); // Refresh user data
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Error al eliminar el pago");
    }
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetUser) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast.error("No autorizado");
        return;
      }

      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes permisos para realizar esta acción");
          return;
        }
        throw new Error("Error al eliminar usuario");
      }

      toast.success("Usuario eliminado correctamente");
      router.push("/users"); // Redirect to users list
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar el usuario");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto px-4">
        {targetUser && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-6">Información Personal
                  <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {targetUser.role === "admin"
                            ? "Administrador"
                            : targetUser.role === "staff"
                            ? "Staff"
                            : "Usuario"}
                        </span>
                        <div className="hidden md:flex items-center gap-2">
                        {targetUser.status === "suspended" ? (
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Suspendido
                            </span>
                          ) : targetUser.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const lastMedicalInsurance = userPayments.find(
                                  (p) => p.concept === "Seguro Médico"
                                );
                                const hasValidMedicalInsurance = lastMedicalInsurance && isValidMedicalInsurance(lastMedicalInsurance.payment_date);

                                const { month, year } = getCurrentMonthYear();
                                const currentMonthPayments = userPayments.filter(
                                  (p) => {
                                    const paymentDate = new Date(p.payment_date);
                                    return (
                                      paymentDate.getMonth() === month - 1 &&
                                      paymentDate.getFullYear() === year &&
                                      p.concept !== "Seguro Médico" &&
                                      p.concept !== "Matrícula"
                                    );
                                  }
                                );
                                const hasCurrentMonthPayment = currentMonthPayments.length > 0;

                                if (!hasValidMedicalInsurance && !hasCurrentMonthPayment) {
                                  return (
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                      Pendiente de pago
                                    </span>
                                  );
                                } else if (!hasValidMedicalInsurance) {
                                  return (
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                      Seguro Médico Pendiente
                                    </span>
                                  );
                                } else if (!hasCurrentMonthPayment) {
                                  return (
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                      Cuota Mensual Pendiente
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Activo
                            </span>
                          )}</div></div>
                          </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="space-y-6">
                    {/* Datos del usuario */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fila 2: Nombre y DNI */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nombre completo
                        </label>
                        <p className="text-gray-900">
                          {targetUser.name || "No especificado"} {targetUser.first_surname || "No especificado"} {targetUser.second_surname || "No especificado"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          DNI
                        </label>
                        <p className="text-gray-900">
                          {targetUser.dni || "No especificado"}
                        </p>
                      </div>

                      {/* Fila 3: Email y Teléfono */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <p className="text-gray-900">{targetUser.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Teléfono
                        </label>
                        <p className="text-gray-900">
                          {targetUser.phone || "No especificado"}
                        </p>
                      </div>
                      <div className="md:hidden">
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                      {targetUser.status === "suspended" ? (
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Suspendido
                            </span>
                          ) : targetUser.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const lastMedicalInsurance = userPayments.find(
                                  (p) => p.concept === "Seguro Médico"
                                );
                                const hasValidMedicalInsurance = lastMedicalInsurance && isValidMedicalInsurance(lastMedicalInsurance.payment_date);

                                const { month, year } = getCurrentMonthYear();
                                const currentMonthPayments = userPayments.filter(
                                  (p) => {
                                    const paymentDate = new Date(p.payment_date);
                                    return (
                                      paymentDate.getMonth() === month - 1 &&
                                      paymentDate.getFullYear() === year &&
                                      p.concept !== "Seguro Médico" &&
                                      p.concept !== "Matrícula"
                                    );
                                  }
                                );
                                const hasCurrentMonthPayment = currentMonthPayments.length > 0;

                                if (!hasValidMedicalInsurance && !hasCurrentMonthPayment) {
                                  return (
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                      Pendiente de pago
                                    </span>
                                  );
                                } else if (!hasValidMedicalInsurance) {
                                  return (
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                      Seguro Médico Pendiente
                                    </span>
                                  );
                                } else if (!hasCurrentMonthPayment) {
                                  return (
                                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                      Cuota Mensual Pendiente
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                              Activo
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="md:col-span-2"
                      >
                        Editar datos
                      </Button>
                      {/* Si es el propio usuario, mostrar botón para cambiar contraseña */}
                      {user?.id === targetUser.id && (
                        <Button
                          variant="outline"
                          onClick={() => setShowPasswordDialog(true)}
                        >
                          Cambiar mi contraseña
                        </Button>
                      )}
                      {targetUser.role !== "admin" && isAdmin && (
                        <Button variant="outline" onClick={handleRoleChange}>
                          {targetUser.role === "staff"
                            ? "Quitar permisos de staff"
                            : "Dar permisos de staff"}
                        </Button>
                      )}
                      {/* Solo mostrar reset password si no es el propio usuario */}
                      {user?.id !== targetUser.id && (
                        <Button variant="outline" onClick={handlePasswordReset}>
                          Reset contraseña
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleEmailChange}>
                        Cambiar email
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={handleSuspendToggle}
                      >
                        {targetUser.status === "suspended"
                          ? "Activar cuenta"
                          : "Suspender cuenta"}
                      </Button>
                      {targetUser.role !== "admin" && isAdmin && (
                        <Button
                          variant="destructive"
                          className="text-white"
                          onClick={handleDeleteUser}
                        >
                          Eliminar usuario
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <p className="text-gray-900 text-sm">
                        {targetUser.email} (no editable)
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nombre
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="first_surname"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Primer Apellido
                      </label>
                      <input
                        type="text"
                        id="first_surname"
                        value={formData.first_surname}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            first_surname: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="second_surname"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Segundo Apellido
                      </label>
                      <input
                        type="text"
                        id="second_surname"
                        value={formData.second_surname}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            second_surname: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="dni"
                        className="block text-sm font-medium text-gray-700"
                      >
                        DNI
                      </label>
                      <input
                        type="text"
                        id="dni"
                        value={formData.dni}
                        onChange={(e) =>
                          setFormData({ ...formData, dni: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Guardar cambios</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Historial de pagos */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Historial de Pagos</CardTitle>
                  {(isAdmin || isStaff) && (
                    <Button
                      onClick={() => setShowCreatePaymentDialog(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Pago
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {userPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No hay pagos registrados para este usuario.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {userPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentOptions(true);
                        }}
                      >
                        <div>
                          <p className="font-medium">{payment.concept}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(
                              payment.payment_date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{payment.amount}€</p>
                          <p className="text-sm text-gray-600">
                            {payment.payment_method}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialog para cambio de contraseña del propio usuario */}
      <PasswordResetDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={handleOwnPasswordReset}
      />

      {/* Dialog para crear pago */}
      <CreatePaymentDialog
        isOpen={showCreatePaymentDialog}
        onClose={() => setShowCreatePaymentDialog(false)}
        targetUser={targetUser}
      />

      {/* Dialog de opciones de pago */}
      <PaymentOptionsDialog
        isOpen={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        payment={selectedPayment}
        onEdit={handleEditPayment}
        onDelete={handleDeletePayment}
      />

      {/* Dialog para editar pago */}
      <EditPaymentDialog
        isOpen={showEditPaymentDialog}
        onClose={() => setShowEditPaymentDialog(false)}
        payment={selectedPayment}
        onSave={fetchUserData}
      />

      {/* Dialog para confirmar eliminación de usuario */}
      <DeleteUserDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        userName={targetUser?.name || ""}
      />
    </div>
  );
}

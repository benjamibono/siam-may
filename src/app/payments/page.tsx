"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface UserOption {
  id: string;
  label: string;
  email: string;
}



export default function PaymentsPage() {
  const { user, isLoading, isAdmin, isStaff } = useProfile();
  const [payments, setPayments] = useState<Tables<"payments">[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<Tables<"payments"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const [users, setUsers] = useState<UserOption[]>([]);
  const [openUserSearch, setOpenUserSearch] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  useEffect(() => {
    if (user && (isAdmin || isStaff)) {
      fetchPayments();
      fetchUsers();
    }
  }, [user, isAdmin, isStaff]);

  const fetchUsers = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch("/api/payments/users", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener usuarios");
      }

      const { users } = await response.json();
      setUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar los usuarios");
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Error al cargar los pagos");
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.full_name) {
      toast.error("Debes seleccionar un usuario");
      return;
    }

    try {
      if (editingPayment) {
        // Actualizar pago existente
        const { error } = await supabase
          .from("payments")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPayment.id);

        if (error) throw error;
        toast.success("Pago actualizado correctamente");
      } else {
        // Crear nuevo pago
        const { error } = await supabase.from("payments").insert(formData);

        if (error) throw error;
        toast.success("Pago registrado correctamente");
      }

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
                    ? "Al día"
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

      // Reset form
      setFormData({
        user_id: "",
        full_name: "",
        concept: "Cuota mensual Muay Thai",
        amount: 30,
        payment_method: "Efectivo",
        payment_date: new Date().toISOString().split("T")[0],
      });
      setIsCreating(false);
      setEditingPayment(null);
      fetchPayments();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("Error al guardar el pago");
    }
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
                    ? "Al día"
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

      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Error al eliminar el pago");
    }
  };

  const cancelForm = () => {
    setFormData({
      user_id: "",
      full_name: "",
      concept: "Cuota mensual Muay Thai",
      amount: 30,
      payment_method: "Efectivo",
      payment_date: new Date().toISOString().split("T")[0],
    });
    setIsCreating(false);
    setEditingPayment(null);
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.concept.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const filteredUsers = users.filter((user) =>
    user.label.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  if (isLoading || loadingPayments) {
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

        {/* Búsqueda y botón crear pago */}
        {!isCreating && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={() => setIsCreating(true)}
                  className="sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Pago
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Formulario de creación/edición */}
        {isCreating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingPayment ? "Editar Pago" : "Registrar Nuevo Pago"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="user"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Usuario
                  </label>
                  <Popover
                    open={openUserSearch}
                    onOpenChange={setOpenUserSearch}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUserSearch}
                        className="w-full justify-between"
                      >
                        {formData.full_name || "Seleccionar usuario..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Buscar usuario..."
                          value={userSearchTerm}
                          onValueChange={setUserSearchTerm}
                        />
                        <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                        <CommandGroup>
                          {filteredUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  user_id: user.id,
                                  full_name: user.label,
                                });
                                setOpenUserSearch(false);
                                setUserSearchTerm("");
                              }}
                            >
                              <div>
                                <p>{user.label}</p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label
                    htmlFor="concept"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Concepto
                  </label>
                  <select
                    id="concept"
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
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Importe (€)
                  </label>
                  <input
                    type="number"
                    id="amount"
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
                  <label
                    htmlFor="payment_method"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Método de Pago
                  </label>
                  <select
                    id="payment_method"
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
                  <label
                    htmlFor="payment_date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    id="payment_date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-evenly">
                  <Button type="submit">
                    {editingPayment ? "Actualizar Pago" : "Registrar Pago"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelForm}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (editingPayment) {
                        handleDeletePayment(editingPayment);
                        setIsCreating(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de pagos */}
        <div className="flex flex-col gap-3">
          {filteredPayments.map((payment) => (
            <Card
              key={payment.id}
              className="py-2 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setFormData({
                  ...formData,
                  user_id: payment.user_id,
                  full_name: payment.full_name,
                  concept: payment.concept as typeof formData.concept,
                  amount: payment.amount,
                  payment_method:
                    payment.payment_method as typeof formData.payment_method,
                  payment_date: payment.payment_date,
                });
                setIsCreating(true);
                setEditingPayment(payment);
              }}
            >
              <CardContent className="py-3">
                <div className="space-y-1">
                  {/* Primera línea: nombre, fecha, importe */}
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-base">
                      {payment.full_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {payment.amount}€
                      </span>
                    </div>
                  </div>
                  {/* Segunda línea: concepto y método */}
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{payment.concept}</span>
                    <span>{payment.payment_method}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPayments.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">
                {searchTerm
                  ? "No se encontraron pagos con ese criterio"
                  : "No hay pagos registrados aún."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>


    </div>
  );
}

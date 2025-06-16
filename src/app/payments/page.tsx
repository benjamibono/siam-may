"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, CreditCard, Plus, Edit, Trash, Search } from "lucide-react";
import type { Tables } from "@/lib/supabase";

export default function PaymentsPage() {
  const { user, profile, isLoading, isAdmin, isStaff } = useProfile();
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
      | "Matrícula",
    amount: 0,
    payment_method: "Efectivo" as "Efectivo" | "Bizum" | "Transferencia",
    payment_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user && (isAdmin || isStaff)) {
      fetchPayments();
    }
  }, [user, isAdmin, isStaff]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      toast.error("Error al cargar los pagos");
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      // Reset form
      setFormData({
        user_id: "",
        full_name: "",
        concept: "Cuota mensual Muay Thai",
        amount: 0,
        payment_method: "Efectivo",
        payment_date: new Date().toISOString().split("T")[0],
      });
      setIsCreating(false);
      setEditingPayment(null);
      fetchPayments();
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast.error("Error al guardar el pago");
    }
  };

  const handleEdit = (payment: Tables<"payments">) => {
    setFormData({
      user_id: payment.user_id,
      full_name: payment.full_name,
      concept: payment.concept,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
    });
    setEditingPayment(payment);
    setIsCreating(true);
  };

  const handleDelete = async (paymentId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("Pago eliminado correctamente");
      fetchPayments();
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error("Error al eliminar el pago");
    }
  };

  const cancelForm = () => {
    setFormData({
      user_id: "",
      full_name: "",
      concept: "Cuota mensual Muay Thai",
      amount: 0,
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
        return 50;
      case "Cuota mensual MMA":
        return 60;
      case "Cuota mensual Muay Thai + MMA":
        return 80;
      case "Matrícula":
        return 30;
      default:
        return 0;
    }
  };

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
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Pagos
            </h1>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        {!isCreating && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o concepto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="full_name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Nombre completo del usuario"
                  />
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
                        amount: parseFloat(e.target.value),
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

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingPayment ? "Actualizar Pago" : "Registrar Pago"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de pagos */}
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">
                        {payment.full_name}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Concepto:</span>{" "}
                        {payment.concept}
                      </div>
                      <div>
                        <span className="font-medium">Importe:</span>{" "}
                        {payment.amount}€
                      </div>
                      <div>
                        <span className="font-medium">Método:</span>{" "}
                        {payment.payment_method}
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span>{" "}
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(payment)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(payment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPayments.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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

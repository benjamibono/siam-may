"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

// interface RateLimitState { // Unused interface
//   limit: number;
//   remaining: number;
//   reset: number;
//   type: string;
// }

interface RateLimitIndicatorProps {
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  action: string;
  className?: string;
}

export function RateLimitIndicator({
  rateLimitInfo,
  action,
  className = "",
}: RateLimitIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!rateLimitInfo) return;

    const updateTimeLeft = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((rateLimitInfo.reset - now) / 1000));
      setTimeLeft(left);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  if (!rateLimitInfo) return null;

  const { limit, remaining } = rateLimitInfo;
  const percentage = (remaining / limit) * 100;

  // Determinar el color y mensaje basado en el porcentaje restante
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let message = "";

  if (percentage <= 0) {
    variant = "destructive";
    message = `Límite alcanzado. Espera ${formatTime(timeLeft)}.`;
  } else if (percentage <= 20) {
    variant = "destructive";
    message = `¡Cuidado! Solo quedan ${remaining} intentos de ${action}.`;
  } else if (percentage <= 50) {
    variant = "secondary";
    message = `Quedan ${remaining} de ${limit} intentos de ${action}.`;
  } else {
    return null; // No mostrar nada si hay suficientes intentos restantes
  }

  return (
    <div className={`flex items-center justify-center p-2 ${className}`}>
      <Badge variant={variant} className="text-xs">
        {message}
      </Badge>
    </div>
  );
}

interface RateLimitWarningProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export function RateLimitWarning({
  show,
  message,
  onClose,
}: RateLimitWarningProps) {
  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Límite de uso excedido
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{message}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="bg-red-100 px-2 py-1 text-xs font-medium text-red-800 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GlobalRateLimitProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [rateLimitWarning, setRateLimitWarning] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: "" });

  // Hook global para manejar errores de rate limiting
  useEffect(() => {
    const handleRateLimitError = (event: CustomEvent) => {
      setRateLimitWarning({
        show: true,
        message: event.detail.message,
      });
    };

    window.addEventListener("rateLimit", handleRateLimitError as EventListener);
    return () => {
      window.removeEventListener(
        "rateLimit",
        handleRateLimitError as EventListener
      );
    };
  }, []);

  return (
    <>
      {children}
      <RateLimitWarning
        show={rateLimitWarning.show}
        message={rateLimitWarning.message}
        onClose={() => setRateLimitWarning({ show: false, message: "" })}
      />
    </>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundo${seconds !== 1 ? "s" : ""}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

// Función utility para disparar eventos de rate limiting globalmente
export function triggerRateLimitEvent(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("rateLimit", {
        detail: { message },
      })
    );
  }
}

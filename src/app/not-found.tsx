"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Imagen de fondo con overlay */}
        <div className="relative m-8">
          <div className="absolute inset-0 bg-black/20 rounded-2xl"></div>
          <Image
            src="/MMA2.webp"
            alt="Siam May MMA"
            width={800}
            height={400}
            className="w-full h-64 sm:h-full object-cover rounded-2xl shadow-xl"
            priority
          />
        </div>

        {/* Contenido principal */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ¡Oops! Esta página no existe
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Parece que has intentado acceder a una página que no está
              disponible.
            </p>
            <p className="text-base text-gray-500 mb-8">
              Como un buen luchador, es hora de regresar al ring principal y
              continúar tu entrenamiento.
            </p>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <Home className="h-5 w-5" />
                  Volver al Inicio
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                Página Anterior
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mensaje motivacional */}
        <div className="m-8 text-center">
          <p className="text-sm text-gray-500 italic">
            &quot;En Siam May, cada caída es una oportunidad para levantarse
            más fuerte&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

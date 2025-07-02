"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import type { Tables } from "@/lib/supabase";
import { useApiCache } from "@/hooks/useApiCache";

interface AnnouncementWithProfile extends Tables<"announcements"> {
  profiles?: {
    name: string;
    first_surname: string;
    second_surname: string | null;
  } | null;
}

export function Announcements() {
  const fetchAnnouncements = async (): Promise<AnnouncementWithProfile[]> => {
    const response = await fetch("/api/announcements");
    if (!response.ok) {
      throw new Error('Error al cargar anuncios');
    }
    return response.json();
  };

  const { data: announcements = [], isLoading } = useApiCache(
    'announcements',
    fetchAnnouncements,
    {
      staleTime: 2 * 60 * 1000, // 2 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: true,
    }
  );

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        📢 Anuncios
      </h2>
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  {announcement.title}
                </span>
                {announcement.expires_at && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    Hasta {new Date(announcement.expires_at).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                {announcement.content}
              </p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>
                    {announcement.profiles?.name || 'Usuario'} {announcement.profiles?.first_surname || ''}
                  </span>
                </div>
                <span>
                  {new Date(announcement.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 
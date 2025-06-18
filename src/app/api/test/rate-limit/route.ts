import { NextRequest, NextResponse } from "next/server";
import {
  withRateLimit,
  getUserIdentifier,
  getRateLimitStats,
} from "@/lib/rate-limit";

async function testHandler(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "test";

  return NextResponse.json({
    success: true,
    message: `Rate limit test successful for action: ${action}`,
    timestamp: new Date().toISOString(),
    stats: getRateLimitStats(),
  });
}

// Aplicar rate limiting para pruebas (límite bajo para testing)
export const GET = withRateLimit(
  "ENROLLMENT", // Usa el mismo límite que las inscripciones para pruebas
  getUserIdentifier
)(testHandler);

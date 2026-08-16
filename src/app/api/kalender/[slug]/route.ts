import { NextResponse } from "next/server";
import { getEvent } from "@/features/notice-board/domain/events";
import { createEventCalendar } from "@/lib/calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = getEvent((await params).slug);
  if (!event || event.dateExact === false) return new NextResponse("Kein exakter Termin verfügbar", { status: 404 });

  return new NextResponse(createEventCalendar(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

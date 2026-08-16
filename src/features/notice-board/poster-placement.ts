import type { PosterPlacement } from "@/features/notice-board/domain/moderation";

function roundToTenth(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function roundPosterPlacement(placement: PosterPlacement): PosterPlacement {
  return {
    ...placement,
    left: roundToTenth(placement.left),
    top: roundToTenth(placement.top),
    width: roundToTenth(placement.width),
    height: roundToTenth(placement.height),
    rotation: roundToTenth(placement.rotation),
  };
}

export function isActivePoster(
  poster: { status: string; expiresAt: string; placement?: unknown },
  currentDate: string,
) {
  return poster.status === "approved" && Boolean(poster.placement) && poster.expiresAt > currentDate;
}

export function currentGermanDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

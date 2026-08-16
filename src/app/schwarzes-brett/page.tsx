import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { noticeBoards } from "@/features/notice-board/domain/placement";
import { PosterLightbox } from "@/features/notice-board/PosterLightbox";
import { EventList } from "@/features/notice-board/EventList";
import { publicEventEntries, publicPosterEntries, readNoticeBoardContent } from "@/features/notice-board/server/moderation";

type PosterStyle = CSSProperties & Record<"--poster-left" | "--poster-top" | "--poster-width" | "--poster-height" | "--poster-rotation", string>;

export const dynamic = "force-dynamic";

function currentGermanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function NoticeBoardPage() {
  const content = await readNoticeBoardContent();
  const approvedPosters = publicPosterEntries(content, currentGermanDate());
  const approvedEvents = publicEventEntries(content);
  return (
    <section className="bulletin-board-page shell" aria-labelledby="bulletin-board-heading">
      <div className="bulletin-board-header">
        <h1 id="bulletin-board-heading" className="bulletin-board-heading">
          Schwarzes Brett
        </h1>
        <Link className="bulletin-board-submit-link" href="/schwarzes-brett/einreichen">
          Eintrag einreichen
        </Link>
      </div>
      <div className="bulletin-board-display">
        {noticeBoards.map((board) => (
          <div className="bulletin-board-card" key={board.id}>
            <div className="bulletin-board-canvas">
              <Image
                src="/bulletin-board-transparent.png"
                fill
                sizes="(max-width: 780px) 100vw, 48vw"
                priority={board.id === "left"}
                loading="eager"
                alt=""
                className="bulletin-board-image"
              />
              {approvedPosters.filter((poster) => poster.placement?.boardId === board.id).map((poster) => (
                <PosterLightbox
                  className="bulletin-board-poster bulletin-board-poster-approved"
                  key={poster.id}
                  src={`/api/notice-board/media/${poster.mediaId}`}
                  title={poster.title}
                  style={{
                    "--poster-left": `${poster.placement!.left}%`,
                    "--poster-top": `${poster.placement!.top}%`,
                    "--poster-width": `${poster.placement!.width}%`,
                    "--poster-height": `${poster.placement!.height}%`,
                    "--poster-rotation": `${poster.placement!.rotation}deg`,
                    zIndex: poster.layer + 10,
                  } as PosterStyle}
                />
              ))}
              <span className="bulletin-board-pin bulletin-board-pin-top" />
              <span className="bulletin-board-pin bulletin-board-pin-bottom" />
            </div>
          </div>
        ))}
      </div>
      <section className="notice-event-section" aria-labelledby="notice-event-heading">
        <div className="notice-event-header">
          <p className="news-eyebrow">Termine und Möglichkeiten</p>
          <h2 id="notice-event-heading">Veranstaltungen</h2>
        </div>
        <EventList events={approvedEvents} />
      </section>
    </section>
  );
}

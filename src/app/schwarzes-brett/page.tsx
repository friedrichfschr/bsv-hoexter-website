import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { noticeBoards } from "@/domain/notice-board";

type PosterStyle = CSSProperties & Record<"--poster-left" | "--poster-top" | "--poster-width" | "--poster-height" | "--poster-rotation", string>;

export default function NoticeBoardPage() {
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
      <div className="bulletin-board-display" aria-hidden="true">
        {noticeBoards.map((board) => (
          <div className="bulletin-board-card" key={board.id}>
            <div className="bulletin-board-canvas">
              <Image
                src="/bulletin-board-transparent.png"
                fill
                sizes="(max-width: 780px) 100vw, 48vw"
                alt=""
                className="bulletin-board-image"
              />
              {board.posters.map((poster) => (
                <span
                  className="bulletin-board-poster"
                  key={poster.id}
                  style={{
                    "--poster-left": `${poster.left}%`,
                    "--poster-top": `${poster.top}%`,
                    "--poster-width": `${poster.width}%`,
                    "--poster-height": `${poster.height}%`,
                    "--poster-rotation": `${poster.rotation}deg`,
                  } as PosterStyle}
                >
                  <Image src={poster.src} fill sizes="160px" alt="" />
                </span>
              ))}
              <span className="bulletin-board-pin bulletin-board-pin-top" />
              <span className="bulletin-board-pin bulletin-board-pin-bottom" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

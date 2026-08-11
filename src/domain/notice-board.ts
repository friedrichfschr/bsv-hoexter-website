export type NoticeBoardPoster = {
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
};

export type NoticeBoard = {
  id: "left" | "right";
  posters: readonly NoticeBoardPoster[];
};

export const noticeBoardCapacity = {
  minimum: 10,
  maximum: 15,
} as const;

export const noticeBoards: readonly NoticeBoard[] = [
  {
    id: "left",
    posters: [
      {
        id: "left-poster-a",
        src: "/notice-board/posters/music-festival.webp",
        left: 14,
        top: 19,
        width: 18,
        height: 33,
        rotation: -4,
      },
      {
        id: "left-poster-b",
        src: "/notice-board/posters/mint-camps.webp",
        left: 60,
        top: 22,
        width: 18,
        height: 38,
        rotation: 3,
      },
    ],
  },
  {
    id: "right",
    posters: [
      {
        id: "right-poster-a",
        src: "/notice-board/posters/mathematics-olympiad.webp",
        left: 17,
        top: 15,
        width: 12,
        height: 50,
        rotation: 3,
      },
      {
        id: "right-poster-b",
        src: "/notice-board/posters/graduation-party.webp",
        left: 59,
        top: 21,
        width: 20,
        height: 39,
        rotation: -4,
      },
    ],
  },
];

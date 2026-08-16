export type NoticeBoard = {
  id: "left" | "right";
};

export const noticeBoardCapacity = {
  minimum: 10,
  maximum: 15,
} as const;

export const noticeBoards: readonly NoticeBoard[] = [{ id: "left" }, { id: "right" }];

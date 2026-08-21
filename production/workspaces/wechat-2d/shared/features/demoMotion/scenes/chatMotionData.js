export const DEFAULT_FPS = 30;
export const MESSAGE_GAP_SECONDS = 0.5;
export const POP_MOTION_SECONDS = 0.32;
export const STREAM_CHAR_SECONDS = 0.045;
export const STREAM_MIN_SECONDS = 0.4;
export const STREAM_MAX_SECONDS = 0.9;
export const STREAM_REVEAL_SECONDS = 0.14;
export const STREAM_SPEED_MULTIPLIER = 1.5;
export const END_HOLD_SECONDS = 0.8;

export const ROLE_SELF = "self";
export const ROLE_CHAT_PARTNER = "chatPartner";

export const SCREEN_WIDTH = 390;
export const HEADER_HEIGHT = 49;
export const COMPOSER_HEIGHT = 82;
export const MESSAGE_VIEWPORT_HEIGHT = 660;
export const SCREEN_HEIGHT = HEADER_HEIGHT + MESSAGE_VIEWPORT_HEIGHT + COMPOSER_HEIGHT;

export const CHAT_PARTNER_NAME = "Vibe Motion 协作";

export const CHAT_ITEMS = Object.freeze([
  {
    type: "timestamp",
    label: "14:30",
  },
  {
    type: "text",
    from: ROLE_SELF,
    text: "想做一条 Vibe Motion Skill 展示片",
  },
  {
    type: "text",
    from: ROLE_CHAT_PARTNER,
    text: "可以，Prompt、动画、成片分开生成，先把目标拆清楚",
  },
  {
    type: "text",
    from: ROLE_SELF,
    text: "那每个 Skill 先单独查看",
  },
  {
    type: "text",
    from: ROLE_CHAT_PARTNER,
    text: "没问题，等全部完成后再统一剪辑和配乐",
  },
  {
    type: "text",
    from: ROLE_SELF,
    text: "好，就按这个来",
  },
]);

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const easeOutBack = (value) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
};

export const isSelfMessage = (item) => item.from === ROLE_SELF;

export const usesStreamingTextMotion = (item) =>
  item.from === ROLE_CHAT_PARTNER && item.type === "text";

export const getFrameProgress = (currentFrame, startFrame, durationFrames) => {
  if (durationFrames <= 0) {
    return currentFrame >= startFrame ? 1 : 0;
  }

  return clamp((currentFrame - startFrame) / durationFrames, 0, 1);
};

const getMotionSeconds = (item) => {
  if (usesStreamingTextMotion(item)) {
    const charCount = Array.from(item.text || "").length;
    const baseStreamSeconds = clamp(
      charCount * STREAM_CHAR_SECONDS,
      STREAM_MIN_SECONDS,
      STREAM_MAX_SECONDS
    );
    return baseStreamSeconds / STREAM_SPEED_MULTIPLIER;
  }

  return POP_MOTION_SECONDS;
};

export const buildTimeline = (items = CHAT_ITEMS, fps = DEFAULT_FPS) => {
  let cursorFrame = 0;
  const slotsByIndex = {};
  const messageIndices = [];

  items.forEach((item, index) => {
    if (item.type === "timestamp") {
      return;
    }

    const motionFrames = getMotionSeconds(item) * fps;
    const startFrame = cursorFrame;
    const endFrame = startFrame + motionFrames;

    slotsByIndex[index] = {
      startFrame,
      endFrame,
      motionFrames,
    };
    messageIndices.push(index);
    cursorFrame = endFrame + MESSAGE_GAP_SECONDS * fps;
  });

  const lastMessageIndex = messageIndices[messageIndices.length - 1];
  const totalFrames =
    lastMessageIndex === undefined ? 0 : slotsByIndex[lastMessageIndex].endFrame;

  return {
    slotsByIndex,
    totalFrames,
    durationInFrames: Math.max(1, Math.ceil(totalFrames + END_HOLD_SECONDS * fps)),
  };
};

export const getItemLayoutHeight = (item) => {
  if (item.type === "timestamp") {
    return 18;
  }

  return 40;
};

export const getVisibleEntries = ({ items = CHAT_ITEMS, currentFrame = 0, slotsByIndex = {} }) =>
  items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter((entry) => {
      if (entry.item.type === "timestamp") {
        return true;
      }

      const slot = slotsByIndex[entry.originalIndex];
      return slot ? currentFrame >= slot.startFrame : false;
    });

export const getScrollOffset = ({ visibleEntries, currentFrame, slotsByIndex }) => {
  const viewportHeight = SCREEN_HEIGHT - HEADER_HEIGHT - COMPOSER_HEIGHT;
  const verticalPadding = 32;
  const gap = 24;
  const contentHeight =
    verticalPadding +
    visibleEntries.reduce((sum, entry, index) => {
      const itemHeight = getItemLayoutHeight(entry.item);
      const itemGap = index === 0 ? 0 : gap;
      return sum + itemGap + itemHeight;
    }, 0);

  const targetOffset = Math.max(0, contentHeight - viewportHeight);
  const latestEntry = [...visibleEntries]
    .reverse()
    .find((entry) => entry.item.type !== "timestamp");

  if (!latestEntry) {
    return 0;
  }

  const latestSlot = slotsByIndex[latestEntry.originalIndex];
  const revealProgress = latestSlot
    ? getFrameProgress(currentFrame, latestSlot.startFrame, latestSlot.motionFrames)
    : 1;

  return targetOffset * revealProgress;
};

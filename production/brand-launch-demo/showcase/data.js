export const SHOWCASE_FPS = 30;
export const SHOWCASE_WIDTH = 1920;
export const SHOWCASE_HEIGHT = 1080;
export const INTRO_FRAMES = 300;
export const OUTRO_FRAMES = 60;
export const SHOWCASE_SOUNDTRACK_VOLUME = 1.0;
export const SHOWCASE_SOUNDTRACK_FADE_IN_FRAMES = 45;
export const SHOWCASE_SOUNDTRACK_FADE_OUT_FRAMES = 75;

const SOURCE_SEGMENTS = [
  {
    number: "01",
    slug: "3d-chladni-render",
    name: "3D CHLADNI RENDER",
    promptFrames: 66,
    invocationFrames: 64,
    durationInFrames: 150,
    prompt: "做一个 3D Chladni 纹理球体动画，带缓慢旋转和冷色光效。",
    effectSummary: "3D 克拉尼纹理球体",
  },
  {
    number: "05",
    slug: "light-spotlight-render",
    name: "LIGHT SPOTLIGHT RENDER",
    promptFrames: 70,
    invocationFrames: 66,
    durationInFrames: 180,
    prompt: "做一个聚光灯扫过标题的 reveal 动效，文字是‘AI 产品动效展示’。",
    effectSummary: "聚光灯文字揭幕",
  },
  {
    number: "06",
    slug: "pixel2motion",
    name: "PIXEL2MOTION",
    promptFrames: 71,
    invocationFrames: 59,
    durationInFrames: 180,
    prompt: "把一张静态 Logo 转成平滑 SVG，再制作可编辑的 Logo 动效开场。",
    effectSummary: "像素图转可编辑动效",
  },
  {
    number: "07",
    slug: "printed-curtain-render",
    name: "PRINTED CURTAIN RENDER",
    promptFrames: 67,
    invocationFrames: 66,
    durationInFrames: 180,
    prompt: "把 VIBE MOTION 文字织进可交互线帘，表现丝线起伏和展开。",
    effectSummary: "可交互文字线帘",
  },
  {
    number: "08",
    slug: "procedural-fish-render",
    name: "PROCEDURAL FISH RENDER",
    promptFrames: 61,
    invocationFrames: 66,
    durationInFrames: 210,
    prompt: "生成一段自然游动的程序化鱼群动画，气质安静、循环流畅。",
    effectSummary: "程序化鱼群游动",
  },
  {
    number: "09",
    slug: "remotion-3d-ticker",
    name: "REMOTION 3D TICKER",
    promptFrames: 63,
    invocationFrames: 65,
    durationInFrames: 180,
    prompt: "做一个可循环的 3D 纵向照片滚动墙，让三列素材形成视差。",
    effectSummary: "三列 3D 视差滚动",
  },
  {
    number: "10",
    slug: "remotion-candlestick",
    name: "REMOTION CANDLESTICK",
    promptFrames: 61,
    invocationFrames: 67,
    durationInFrames: 180,
    prompt: "做一段深色交易终端风格的 K 线动画，走势先涨后回落。",
    effectSummary: "交易终端 K 线走势",
  },
  {
    number: "11",
    slug: "remotion-vinyl-player",
    name: "REMOTION VINYL PLAYER",
    promptFrames: 59,
    invocationFrames: 65,
    durationInFrames: 180,
    prompt: "做一段复古黑胶唱片机动画，唱片转动并滚动专辑文字。",
    effectSummary: "复古黑胶唱片机",
  },
  {
    number: "12",
    slug: "ruler-progress-render",
    name: "RULER PROGRESS RENDER",
    promptFrames: 70,
    invocationFrames: 66,
    durationInFrames: 180,
    prompt: "做一个尺子进度梗图：梁圣 → 梁神 → 梁哥 → 老梁 → 小梁 → 梁子",
    effectSummary: "尺子进度人物梗图",
  },
  {
    number: "13",
    slug: "svg-assembly-animator",
    name: "SVG ASSEMBLY ANIMATOR",
    promptFrames: 62,
    invocationFrames: 68,
    durationInFrames: 160,
    prompt: "做一辆俯视线稿汽车 SVG，先拆解零件，再分层组装回来。",
    effectSummary: "SVG 零件拆解组装",
  },
  {
    number: "14",
    slug: "threejs-earth-render",
    name: "THREE.JS EARTH RENDER",
    promptFrames: 56,
    invocationFrames: 65,
    durationInFrames: 181,
    prompt: "渲染三维地球航线动画，突出全球连线和穿梭感。",
    effectSummary: "三维地球全球航线",
  },
  {
    number: "15",
    slug: "wechat-2d-render",
    name: "WECHAT 2D RENDER",
    promptFrames: 59,
    invocationFrames: 61,
    durationInFrames: 147,
    prompt: "构建微信聊天窗口动效，表现消息流、回复和沟通节奏。",
    effectSummary: "微信消息流动效",
  },
];

export const SEGMENTS = Object.freeze(
  SOURCE_SEGMENTS.map((segment, index) =>
    Object.freeze({
      ...segment,
      displayNumber: String(index + 1).padStart(2, "0"),
    }),
  ),
);

export const SEGMENT_TIMINGS = Object.freeze(
  SEGMENTS.map((segment, index) => {
    const previousFrames = SEGMENTS.slice(0, index).reduce(
      (total, item) => total + item.promptFrames + item.durationInFrames,
      0,
    );
    const promptStart = INTRO_FRAMES + previousFrames;
    const effectStart = promptStart + segment.promptFrames;
    return Object.freeze({
      ...segment,
      promptStart,
      effectStart,
      effectEnd: effectStart + segment.durationInFrames,
      invocationVideoPath: `showcase/v4-invocations/${segment.displayNumber}-${segment.slug}.mov`,
      videoPath: `showcase/segments/${segment.number}/animation.mp4`,
    });
  }),
);

export const OUTRO_START = SEGMENT_TIMINGS.at(-1).effectEnd;
export const SHOWCASE_DURATION_IN_FRAMES = OUTRO_START + OUTRO_FRAMES;

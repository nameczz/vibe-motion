import React from "react";
import {Composition} from "remotion";
import {DisneyAnimationRuleSkill} from "./demos/DisneyAnimationRuleSkill";
import {Remotion3DTicker} from "./demos/Remotion3DTicker";
import {RemotionCandlestick} from "./demos/RemotionCandlestick";
import {RemotionVinylPlayer} from "./demos/RemotionVinylPlayer";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 180;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="disney-animation-rule-skill"
        component={DisneyAnimationRuleSkill}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={DURATION}
        defaultProps={{}}
      />
      <Composition
        id="remotion-3d-ticker"
        component={Remotion3DTicker}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={DURATION}
        defaultProps={{}}
      />
      <Composition
        id="remotion-candlestick"
        component={RemotionCandlestick}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={DURATION}
        defaultProps={{}}
      />
      <Composition
        id="remotion-vinyl-player"
        component={RemotionVinylPlayer}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={DURATION}
        defaultProps={{}}
      />
    </>
  );
};

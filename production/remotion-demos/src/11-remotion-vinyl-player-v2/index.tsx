import React from "react";
import {Composition, registerRoot} from "remotion";
import {VinylEscapePlayer} from "./VinylEscapePlayer";

const VinylEscapeRoot: React.FC = () => (
  <Composition
    id="remotion-vinyl-player-v2"
    component={VinylEscapePlayer}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={180}
    defaultProps={{}}
  />
);

registerRoot(VinylEscapeRoot);

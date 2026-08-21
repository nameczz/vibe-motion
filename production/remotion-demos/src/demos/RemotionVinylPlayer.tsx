import React from "react";
import {VinylPlayer} from "../components/VinylPlayer";
import {createAlbumArtDataUri} from "../utils/art";

const cover = createAlbumArtDataUri({
  title: "Nocturne Loop",
  artist: "Synthetic Vinyl Project",
  accent: "#2b3040",
  accent2: "#c43d6d",
});

export const RemotionVinylPlayer: React.FC = () => {
  return (
    <VinylPlayer
      coverUrl={cover}
      songTitle="Nocturne Loop"
      artistName="Synthetic Vinyl Project · side A"
      durationInSeconds={6}
      backgroundColor="#0b1011"
      scale={1.46}
    />
  );
};

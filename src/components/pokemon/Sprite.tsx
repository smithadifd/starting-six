import { getClassNames } from "lib/utils";
import pokeball from "assets/pokeball.png";

interface SpriteProps {
  alt?: string;
  number?: number;
  rounded?: boolean;
  color?: string | null;
  className?: string[];
}

function Sprite({
  alt,
  number,
  rounded = false,
  color = null,
  className = [],
}: SpriteProps) {
  let url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
  let classes = getClassNames(className);

  if (!number) {
    url = pokeball;
  }

  if (rounded) classes += " rounded-full";
  if (color) classes += ` ${color}`;
  if (!number) classes += "align-center w-1/2";

  return <img src={url} alt={alt || String(number)} className={classes} />;
}

export default Sprite;

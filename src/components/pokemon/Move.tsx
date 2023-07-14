import { Move as MoveType } from "lib/types";

interface MoveProps {
  move: MoveType;
}

function Move({ move }: MoveProps) {
  const formattedMove = move.move.name.replace("-", " ");
  return (
    <div>
      <span className="whitespace-nowrap capitalize">{formattedMove}</span>
    </div>
  );
}

export default Move;

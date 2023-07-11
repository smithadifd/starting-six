import { useState, useEffect } from "react";

import { Moves as MovesType } from "lib/types";

import Move from "components/pokemon/Move";

interface MovesProps {
  moves: MovesType[];
}

/**
 * TODO: Use a library like popper.js to handle positioning.
 */
const Moves = ({ moves } : MovesProps) => {
  const [search, setSearch] = useState("");
  const [filteredMoves, setFilteredMoves] = useState(moves);

  useEffect(() => {
    const mv = moves.filter((move) => {
      const { name } = move.move;
      const lowercaseSearch = search.toLowerCase();
      return name.includes(lowercaseSearch);
    });
    setFilteredMoves(mv);
  }, [search]);
  return (
    <div>
      <input
        type="text"
        placeholder="Search moves"
        className="w-full rounded border border-gray-300 p-2"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="h-36 overflow-y-auto bg-white p-2">
        {filteredMoves.map((move) => (
          <li key={move.move.name}>
            <Move move={move} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Moves;

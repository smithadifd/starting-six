import { getClassNames } from "lib/utils";

interface FilterProps {
  filter: string;
  className?: string[] | string;
  handler: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Filter({ filter, handler, className }: FilterProps) {
  return (
    <input
      name="pokemonFilter"
      value={filter}
      type="text"
      placeholder="Search Pokemon by name or number"
      onChange={handler}
      className={getClassNames(
        "w-full rounded border border-gray-300 p-2",
        className
      )}
    />
  );
}

export default Filter;

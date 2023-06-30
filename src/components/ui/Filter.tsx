interface FilterProps {
  filter: string;
  handler: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Filter = ({ filter, handler } : FilterProps) => {
  return (
    <input
      name="pokemonFilter"
      value={filter}
      type="text"
      placeholder="Search Pokemon by name or number"
      onChange={handler}
      className="w-full rounded border border-gray-300 p-2 shadow-sm"
    />
  );
}

export default Filter;

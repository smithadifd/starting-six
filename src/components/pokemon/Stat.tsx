import { Stat as StatType } from "lib/types";

interface StatProps {
  stat: StatType;
}

function Stat({ stat }: StatProps) {
  const displayName = stat.stat.name.replace("-", " ");
  return (
    <div className="prose prose-neutral flex justify-between">
      <span className="mr-2 whitespace-nowrap text-right capitalize">
        {displayName}:
      </span>
      <span>{stat.base_stat}</span>
    </div>
  );
}

export default Stat;

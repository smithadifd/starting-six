import { typeColors } from "lib/utils";

import Pill from "components/ui/Pill";

interface TypeProps {
  type: string;
  effectiveness?: number;
  className?: string;
}

/**
 * Represents a pokemon type chip.
 */
function Type({ type, effectiveness, className } : TypeProps) {
  const color = type === "none" ? "bg-neutral-950" : typeColors(type);
  const hasEffectiveness = effectiveness || effectiveness === 0;
  const translatedEffectiveness = (eff : number) => {
    if (eff === 0.25) return String.fromCharCode(188);
    if (eff === 0.5) return String.fromCharCode(189);
    return eff;
  };

  // Make none type render same height as rest
  const height = type === "none" || hasEffectiveness ? "h-8" : "h-6";
  const width = type === "none" || hasEffectiveness ? "w-28" : "w-16";

  return (
    <Pill
      textColor={`text-slate-50 ${height} ${width} justify-center`}
      backgroundColor={color}
      className={className}
    >
      <span className="uppercase">{type}</span>
      {hasEffectiveness && (
        <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-black">
          {translatedEffectiveness(effectiveness)}x
        </span>
      )}
    </Pill>
  );
}

export default Type;

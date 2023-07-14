import Type from "components/pokemon/Type";

interface TypeEffectivenessProps {
  title: string;
  effectiveTypes: Record<string, number>; // TODO: Replace with more fitting type
}

function TypeEffectiveness({ title, effectiveTypes }: TypeEffectivenessProps) {
  const typesList = Object.entries(effectiveTypes);
  return (
    <div className="my-2 flex flex-col">
      <div className="w-1/6 pl-2">
        <h4 className="prose prose-slate whitespace-nowrap font-semibold">
          {title}:
        </h4>
      </div>
      <div className="flex w-5/6 flex-row flex-wrap">
        {typesList.length > 0 &&
          typesList.map(([name, value]) => (
            <Type
              key={name}
              type={name}
              effectiveness={value}
              className="m-1"
            />
          ))}
        {typesList.length === 0 && <Type type="none" />}
      </div>
    </div>
  );
}

export default TypeEffectiveness;

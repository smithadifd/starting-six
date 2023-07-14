import { Ability as AbilityType } from "lib/types";

import Pill from "components/ui/Pill";

interface AbilityProps {
  ability: AbilityType;
  className?: string;
}

function Ability({ ability, className }: AbilityProps) {
  const formattedAbility = ability.ability.name.replace("-", " ");
  return (
    <Pill className={className}>
      <span className="w-min whitespace-nowrap capitalize">
        {formattedAbility}
      </span>
    </Pill>
  );
}

export default Ability;

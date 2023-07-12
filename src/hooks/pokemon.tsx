import { Pokemon as PokemonType, FullType } from "lib/types";
import { pokemonTypes } from "lib/utils";
import { useGetTypeByNameQuery } from "services/api";

export const useEffectiveness = (pokemon : PokemonType) => {
  const [type1, type2] = pokemon.types;
  const { data: typeDetails1 } = useGetTypeByNameQuery(type1.type.name);
  const { data: typeDetails2 } = useGetTypeByNameQuery(type2?.type?.name, {
    skip: !type2,
  });
  const createActionDetails = () => {
    interface ActionDetail {
      [key: string]: number;
    }

    const actionDetail : ActionDetail = {};
    const types = pokemonTypes();
    for (const type of types) {
      actionDetail[type] = 1;
    }
    return actionDetail;
  };

  const getActions = (details1: FullType, details2: FullType) => {
    // const actions = { offense: createActionDetails(), defense: createActionDetails()};
    const actions = { defense: createActionDetails() };
    // const offensiveKeys = ['double_damage_to', 'half_damage_to', 'no_damage_to'];
    const defensiveKeys: string[] = [
      "double_damage_from",
      "half_damage_from",
      "no_damage_from",
    ];

    for (const typeDetail of [details1, details2]) {
      if (typeDetail) {
        // offensiveKeys.forEach(key => {
        //   typeDetail.damage_relations[key].forEach(t => {
        //     if (key === 'double_damage_to') actions.offense[t.name] *= 2;
        //     else if (key === 'half_damage_to') actions.offense[t.name] *= 0.5;
        //     else if (key === 'no_damage_to') actions.offense[t.name] *= 0;
        //   });
        // });
        defensiveKeys.forEach((key) => {
          typeDetail.damage_relations[key].forEach((t: FullType) => {
            if (key === "double_damage_from") actions.defense[t.name] *= 2;
            else if (key === "half_damage_from") actions.defense[t.name] *= 0.5;
            else if (key === "no_damage_from") actions.defense[t.name] *= 0;
          });
        });
      }
    }
    return actions;
  }

  return getActions(typeDetails1, typeDetails2);
}
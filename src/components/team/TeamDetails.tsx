import { useState, useEffect } from "react";
import { useAppSelector } from "hooks/app";

import { pokemonTypes } from "lib/utils";
import { useEffectiveness } from "hooks/pokemon";
import { Pokemon as PokemonType } from "lib/types";

import Card from "components/ui/Card";
import Type from "components/pokemon/Type";
import MemberEffectiveness from "components/team/MemberEffectiveness";

// FIX: Removing a Pokemon while this component is rendered causes a crash
// due to the number of hooks running an inconsistent number of times.
function getTeamEffectiveness(pokemons: Record<string, PokemonType>) {
  return Object.fromEntries(
    Object.entries(pokemons).map(([name, pokemonDetails]) => {
      const pokemonEffectiveness = useEffectiveness(pokemonDetails);
      return [name, pokemonEffectiveness];
    })
  );
}

// FIX: When no Pokemon are added to team
function TeamDetails() {
  function getTeamTypes(team) {
    return Array.from(
      new Set(
        Object.values(team).flatMap((pokemon) =>
          pokemon.types.map((type) => type.type.name)
        )
      )
    );
  }
  function getMissingTypes(teamTypes) {
    return pokemonTypes().filter((type) => !teamTypes.includes(type));
  }
  function getTeamDefenses(teamEffectiveness) {
    const d = new Map()
      .set(0, new Map())
      .set(0.25, new Map())
      .set(0.5, new Map())
      .set(1, new Map())
      .set(2, new Map())
      .set(4, new Map());

    const setEffectiveness = (
      effectiveness: number,
      type: string,
      name: string
    ) => {
      const current = d.get(effectiveness);
      if (current.has(type)) current.set(type, [...current.get(type), name]);
      else current.set(type, [name]);
    };

    const teamEffectivnessEntries = Object.entries(teamEffectiveness);
    for (const [name, pokemonEffectiveness] of teamEffectivnessEntries) {
      const defensiveEntries = Object.entries(pokemonEffectiveness.defense);
      for (const [type, effectiveness] of defensiveEntries) {
        if (effectiveness === 1) continue;

        if (effectiveness === 0) setEffectiveness(0, type, name);
        else if (effectiveness === 0.25) setEffectiveness(0.25, type, name);
        else if (effectiveness === 0.5) setEffectiveness(0.5, type, name);
        else if (effectiveness === 2) setEffectiveness(2, type, name);
        else if (effectiveness === 4) setEffectiveness(4, type, name);
      }
    }
    return d;
  }

  const chosenPokemon = useAppSelector((state) => state.pokemon.chosenPokemon);
  const teamEffectiveness = getTeamEffectiveness(chosenPokemon);
  const [teamTypes, setTeamTypes] = useState<string[]>(() =>
    getTeamTypes(chosenPokemon)
  );
  const [missingTypes, setMissingTypes] = useState<string[]>(
    getMissingTypes(teamTypes)
  );
  const [defense, setDefense] = useState(getTeamDefenses(teamEffectiveness));

  useEffect(() => {
    setTeamTypes(getTeamTypes(chosenPokemon));
    setMissingTypes(getMissingTypes(teamTypes));
    setDefense(getTeamDefenses(teamEffectiveness));
  }, [chosenPokemon]);

  console.log("defense", defense);

  return (
    <div className="flex flex-wrap">
      <Card className="m-4 w-1/3 p-4">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold">Team Types</h2>
          <div className="flex flex-row flex-wrap">
            {Array.from(teamTypes).map((type) => (
              <Type key={type} type={type} className="m-1" />
            ))}
          </div>
        </div>
      </Card>
      <Card className="m-4 w-1/3 p-4">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold">Missing Types</h2>
          <div className="flex flex-row flex-wrap">
            {Array.from(missingTypes).map((type) => (
              <Type key={type} type={type} className="m-1" />
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">Immune</h2>
        <span>TBD</span>
        {/* {defense.get(0).map((type) => (
          <div className="flex flex-row">
            <Type type={type} className="m-1" />
            <div className="flex flex-col">
              {defense
                .get(0)
                .get(type)
                .map((name) => (
                  <Sprite key={name} number={name} alt={name} />
                ))}
            </div>
          </div>
        ))} */}
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">Resistant</h2>
        <span>TBD</span>
      </Card>
      <Card>
        <h2 className="text-2xl font-bold">Weak</h2>
        <span>TBD</span>
      </Card>
    </div>
  );
}

export default TeamDetails;

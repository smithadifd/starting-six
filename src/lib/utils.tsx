const getClassNames = (...args: any): string => {
  const classes = [];

  for (const arg of args) {
    if (!arg) continue;

    const type = typeof arg;

    if (type === "string" || type === "number") {
      classes.push(arg);
      continue;
    }

    if (Array.isArray(arg)) {
      classes.push(getClassNames(...arg));
      continue;
    }

    if (type === "object") {
      for (const key of Object.keys(arg)) {
        if (Object.hasOwnProperty.call(arg, key) && arg[key]) classes.push(key);
      }
    }
  }

  return classes.join(" ");
};

const getNumberFromUrl = (url: string): number | undefined => {
  if (!url) return;
  return Number(url.split("/")[url.split("/").length - 2]);
};

const typeColors = (type: string): string => {
  interface Colors {
    [key: string]: string;
  }
  const colors: Colors = {
    normal: "bg-gray-400",
    fire: "bg-red-500",
    water: "bg-blue-500",
    electric: "bg-yellow-400",
    grass: "bg-green-500",
    ice: "bg-blue-200",
    fighting: "bg-red-800",
    poison: "bg-purple-800",
    ground: "bg-yellow-600",
    flying: "bg-indigo-400",
    psychic: "bg-pink-500",
    bug: "bg-green-700",
    rock: "bg-yellow-800",
    ghost: "bg-purple-600",
    dragon: "bg-indigo-900",
    dark: "bg-gray-800",
    steel: "bg-gray-600",
    fairy: "bg-pink-300",
  };
  return colors[type];
};

type PokemonTypes = () => string[];
const pokemonTypes: PokemonTypes = () => [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

export { getClassNames, getNumberFromUrl, typeColors, pokemonTypes };

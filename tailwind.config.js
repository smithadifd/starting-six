import plugin from "tailwindcss/plugin";

export const content = ["./src/**/*.tsx", "./src/**/*.ts"];
export const theme = {
  extend: {},
};
export const plugins = [
  plugin(({ addComponents }) => {
    addComponents({
      ".btn": {
        padding: ".5rem 1rem",
        borderRadius: ".25rem",
        fontWeight: "600",
      },
      ".btn-blue": {
        backgroundColor: "#3b82f6",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#2779bd",
        },
      },
      ".btn-red": {
        backgroundColor: "#ef4444",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#cc1f1a",
        },
      },
      ".btn-gray": {
        backgroundColor: "#d1d5db",
        color: "#000",
        "&:hover": {
          backgroundColor: "#9ca3af",
        },
      },
    });
  }),
];

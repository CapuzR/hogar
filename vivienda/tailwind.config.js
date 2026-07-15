/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0d1117",
        panel: "#161b22",
        line: "#2a313c",
        muted: "#8b949e",
        buy: "#e0a458", // ocre — comprar
        rent: "#4c9f70", // verde — alquilar/portafolio
        warn: "#d1495b",
        accent: "#5b8def",
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        clay: "#6b4f3b",
        sand: "#f4efe6",
        cream: "#fbf9f5",
        accent: "#d16a31",
        mint: "#2f7d6b",
        danger: "#b3261e",
      },
      boxShadow: {
        panel: "0 20px 45px rgba(20, 33, 61, 0.12)",
      },
      borderRadius: {
        sheet: "1.75rem",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "SUIT",
          "Noto Sans KR",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

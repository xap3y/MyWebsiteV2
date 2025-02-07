import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#171717",
        secondary: "#1c1c1c",
        secondary_light: "#333333",
        primary_light: "#242424",
        battleship_gray: "#858585",
        whitesmoke: "#f5f5f5",
        telegram: "#24A1DE",
        telegram2: "#0088cc",
        telegramDarker: "#0081c3",
        telegramBright: "#00a7ff",
        telegramBrighter: "#29b1ff",
        telegramBrightest: "#60beff",
      },
      backgroundImage: {
        primaryDotted: "radial-gradient(#242424 1px, #171717 1px)",
        primaryDottedFooter: "radial-gradient(#D5D5B8 1px, #ECECE2 1px)",
      },
      backgroundSize: {
        primaryDottedSize: "15px 15px",
      },
      keyframes: {
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInTop: {
          '0%': { opacity: '0', transform: 'translateY(-50px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInBottom: {
          '0%': { opacity: '0', transform: 'translateY(50px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        extendBorder: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        fadeBlur: {
          '0%': { filter: 'blur(10px)', opacity: '0' },
          '100%': { filter: 'blur(0)', opacity: '1' },
        },
        fadeOpacity: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
        }
      },
      animation: {
        fadeInRight: 'fadeInRight 1s ease-out',
        fadeInLeft: 'fadeInLeft 1s ease-out',
        fadeInTop: 'fadeInTop 1s ease-out',
        fadeInBottom: 'fadeInBottom .5s ease-out',
        fadeInBottom2: 'fadeInBottom .65s ease-out',
        fadeInBottom3: 'fadeInBottom .75s ease-out',
        fadeInBottom4: 'fadeInBottom .85s ease-out',
        extendBorder: 'extendBorder 1s ease-out forwards',
        fadeBlur: 'fadeBlur .9s ease-out',
        fadeOpacity: 'fadeOpacity .7s ease-out',
      },
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [require("tailwind-scrollbar")],
} satisfies Config;

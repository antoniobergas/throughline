/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0E1620",
        panel: "#16212E",
        rail: "#2A3949",
        "text-primary": "#E8EEF2",
        muted: "#7E93A6",
        teal: "#38E1C6",
        violet: "#8B7BF0",
        green: "#6FD08C",
        amber: "#F4A94B",
        coral: "#F2614E",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

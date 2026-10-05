/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind CSS v4 — all design tokens come from src/styles/theme.css
    // (see .agent/theme_plan.txt); there is no tailwind.config on purpose.
    "@tailwindcss/postcss": {},
  },
};

export default config;

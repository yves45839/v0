import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "tsconfig.tsbuildinfo"],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // Le code existant utilise largement les apostrophes françaises non échappées.
      "react/no-unescaped-entities": "off",
      // Règles React 19 strictes : le pattern « setState dans un effet de
      // chargement » est utilisé partout — signal utile mais non bloquant.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]

export default eslintConfig

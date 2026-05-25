import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["src/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

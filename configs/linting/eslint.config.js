import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      typescript: tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Add your custom rules here
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
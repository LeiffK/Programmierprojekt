import js from "@eslint/js"
import ts from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import vue from "eslint-plugin-vue"
import prettier from "eslint-config-prettier"

export default [
  js.configs.recommended,
  vue.configs["vue3-recommended"],
  {
    files: ["**/*.ts", "**/*.vue"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" }
    },
    plugins: { "@typescript-eslint": ts },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn"],
      "vue/multi-word-component-names": "off"
    }
  },
  prettier
]

export default [
  {
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        require: "readonly",
        module: "readonly",
        structuredClone: "readonly",
        URL: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: "error",
    },
  },
];

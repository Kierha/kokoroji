import expoFlat from "eslint-config-expo/flat.js";

export default [
  ...expoFlat,
  {
    files: [
      "**/__tests__/**/*.js",
      "**/*.test.js",
      "**/*.spec.js",
      "**/__tests__/**/*.ts",
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/__tests__/**/*.tsx",
      "**/*.test.tsx",
      "**/*.spec.tsx",
    ],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      "expo/no-dynamic-env-var": "off",
      "@typescript-eslint/no-require-imports": "off",

      // Ajout de la règle no-unused-vars avec ignore des vars et args prefixés par _
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];

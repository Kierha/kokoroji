import expoFlat from "eslint-config-expo/flat.js";

export default [
  ...expoFlat,
  {
    files: ["**/__tests__/**/*.js", "**/*.test.js", "**/*.spec.js"],
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
    },
  },
];

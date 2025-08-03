module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/jest.setup.js",
  ],
  setupFiles: ["<rootDir>/jest.mock.js"], // fichier chargé avant jest.init et définit les mocks
};

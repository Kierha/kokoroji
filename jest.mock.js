/* eslint-env jest */
/* eslint-disable no-undef */
// jest.mock.js

// Mock des icônes vectorielles, à charger avant les tests
jest.mock("@expo/vector-icons", () => {
  return {
    Ionicons: () => null,
    AntDesign: () => null,
    // autres si besoin
  };
});

module.exports = function (api) {
  api.cache(true);
  return {
    // "babel-preset-expo" inclut déjà TypeScript & React. Retirer les doublons évite des transformations multiples
    // susceptibles de casser l’injection des helpers (ex: __extends via tslib).
    presets: ["babel-preset-expo"],
  };
};

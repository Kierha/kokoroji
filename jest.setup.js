/* eslint-env jest */

// jest.setup.js
const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (
    typeof msg === "string" &&
    msg.includes("The global process.env.EXPO_OS is not defined")
  ) {
    return;
  }
  originalWarn(msg, ...args);
};

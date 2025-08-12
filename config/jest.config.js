const { createDefaultPreset } = require("ts-jest");

/** @type {import("jest").Config} **/
module.exports = {
  // Use different test environments for different types of tests
  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/src/lib/**/__tests__/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/src/app/api/**/__tests__/**/*.test.{js,jsx,ts,tsx}",
      ],
      setupFilesAfterEnv: ["<rootDir>/config/jest.setup.js"],
      transform: createDefaultPreset().transform,
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/src/app/components/**/__tests__/**/*.test.{js,jsx,ts,tsx}",
      ],
      setupFilesAfterEnv: ["<rootDir>/config/jest.setup.js"],
      transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", {
          tsconfig: {
            jsx: "react-jsx",
          },
        }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
  ],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
};

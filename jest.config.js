module.exports = {
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json"
    }
  },
  verbose: true,
  moduleFileExtensions: [
    "ts",
    "js"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  roots: [
    'src/',
  ]
};

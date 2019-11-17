'use strict'

// Unlike the rest of the project, this file uses double quotes instead of backticks, because ESLint
// expects the former for the rules.
module.exports = {
  env:
  {
    // Use EMCAScript6 features.
    es6: true,
    // Use Node.js features.
    node: true
  },
  // Use the recommended ruleset as a base.
  extends: "eslint:recommended",
  plugins: ["more-naming-conventions"],
  parserOptions: {
    "ecmaVersion": 8
  },
  rules:
  {
    // These are organized by the order in which they appear in the ESLint docs.

    // Best Practices

    // C++: Require type-safe comparisons.
    "eqeqeq": "error",
    // C++: Warn about unused expressions.
    "no-unused-expressions": "warn",
    // Style: Allow fallthrough in switches.
    "no-fallthrough": "off",

    // Strict Mode

    // Safety: Always use strict mode.
    "strict": [
      "error",
      "global"
    ],

    // Variables

    // C++: Warn for unused variables.
    "no-unused-vars": "warn",

    // Stylistic Issues

    // Style: Force array newlines IF there are any existing newlines (Everything being on one line,
    // and it being a short line is alright.).
    "array-bracket-newline": "warn",
    // Style: Use Allman style braces, warn otherwise.
    "brace-style": [
      "warn",
      "allman"
    ],
    // Style: Use 2 levels of indentation, throw error otherwise.
    "indent": [
      "error",
      2
    ],
    // Consistency: Use template literals, throw error otherwise.
    "quotes": [
      "error",
      "backtick"
    ],
    // Style: Use no more than 100 lines.
    "max-len": [
      "error",
      100
    ],
    // Style: Use spaces only.
    "no-tabs": "error",
    // C++: Use semicolons.
    "semi": "error",

    // Custom Rules
    "more-naming-conventions/snake-case-variables": "warn",
    "more-naming-conventions/upper-camel-case-functions": "warn"
  }
};

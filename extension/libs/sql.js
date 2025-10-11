// Simplified SQL.js for testing
console.log("SQL.js loaded successfully");

// Mock SQL.js functionality for testing
// Use self instead of window for service worker compatibility
const globalObj =
  typeof self !== "undefined"
    ? self
    : typeof window !== "undefined"
    ? window
    : global;

globalObj.initSqlJs = function () {
  return Promise.resolve({
    Database: function () {
      console.log("Mock SQL.js Database created");
      return {
        run: function (sql) {
          console.log("Mock SQL run:", sql);
          return this;
        },
        exec: function (sql) {
          console.log("Mock SQL exec:", sql);
          return [];
        },
        close: function () {
          console.log("Mock SQL database closed");
        },
      };
    },
  });
};

console.log("SQL.js mock loaded");

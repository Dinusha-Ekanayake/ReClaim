module.exports = {
  testEnvironment: 'node',
  // Surface async operations that aren't torn down (e.g. open DB handles).
  detectOpenHandles: true,
  // Fail instead of hanging if a test leaks a handle.
  forceExit: true,
  testTimeout: 20000,
};

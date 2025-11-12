import '@testing-library/jest-dom';

// Mock fetch globally for tests
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  fetch.mockClear();
});

import '@testing-library/jest-dom';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Jest setup file for React Testing Library, can be extended as needed. 
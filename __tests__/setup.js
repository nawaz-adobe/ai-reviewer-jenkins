// Global test setup
require('dotenv').config();

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show console output in verbose mode
if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
}

// Helper to restore console for specific tests
global.restoreConsole = () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
};

// Custom test helpers
global.skipIf = (condition) => (condition ? test.skip : test);

// Add skipIf method to test object
beforeAll(() => {
    test.skipIf = (condition) => (condition ? test.skip : test);
});

// Test environment info
if (process.env.JEST_VERBOSE) {
    console.log('🧪 Test Environment Setup');
    console.log('📍 GitHub Token:', process.env.GITHUB_TOKEN ? '✅ Present' : '❌ Missing');
    console.log('📍 LLM API Key:', process.env.LLM_API_KEY ? '✅ Present' : '❌ Missing');
    console.log('📍 LLM Endpoint:', process.env.LLM_ENDPOINT ? '✅ Present' : '❌ Missing');
    console.log('📍 GitHub Base URL:', process.env.GITHUB_BASE_URL || '(default)');
    console.log('📍 Test Repo:', `${process.env.TEST_GITHUB_ORG || 'farhann1'}/${process.env.TEST_GITHUB_REPO || 'ai-reviewer-test'}`);
}

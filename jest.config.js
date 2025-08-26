module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',       
    '!src/server.ts',       
    '!src/db/migrate.ts', 
    '!src/app.ts',          
    '!src/routes/*.ts'      
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
};

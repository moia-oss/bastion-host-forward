import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import typescript from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/*', 'dist/*', '**/*.d.ts', '**/*.js'],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  eslint.configs.recommended,
  ...typescript.configs.recommended,
  // prettier should be the last config because it disables all formatting rules
  prettier,
];

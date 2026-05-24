import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Prevent scale-up hover transforms on elements inside overflow-hidden parents.
      // Scaling an element that has an overflow-hidden ancestor causes the scaled
      // painted area to be clipped, making buttons appear to shrink on hover.
      // Safe alternatives: brightness, box-shadow, or whileTap scale-down.
      // If you need a scale-up on an element that IS the overflow-hidden root itself,
      // suppress this rule inline with an eslint-disable comment and explain why.
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXAttribute[name.name="className"] > Literal[value=/hover:scale-\\[1\\./]',
          message:
            'Avoid hover:scale-[1.x] Tailwind classes — scale-up transforms on elements inside overflow-hidden parents cause visual clipping. Use brightness-110 or box-shadow instead.',
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];

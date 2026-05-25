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
        'error',
        {
          selector: 'JSXAttribute[name.name="className"] > Literal[value=/hover:scale-\\[1\\./]',
          message:
            'Avoid hover:scale-[1.x] Tailwind classes — scale-up transforms on elements inside overflow-hidden parents cause visual clipping. Use brightness-110 or box-shadow instead.',
        },
        {
          // Catches any `expr as unknown as <T>` double-cast pattern. The inner
          // `as unknown` erases type information before recasting, silently bypassing
          // the type-checker for all generated API types (request objects, response
          // types, sub-objects, etc.). Construct typed objects directly instead.
          // If the cast is genuinely necessary (e.g. framer-motion API mismatch or
          // internal ref narrowing), suppress inline with an explanatory comment.
          selector:
            'TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
          message:
            'Avoid "as unknown as <T>" double-casts — they silently bypass the type-checker for generated API types and other typed objects. Construct the object directly from the target type, or suppress inline with an explanatory eslint-disable-next-line comment if the cast is genuinely unavoidable.',
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];

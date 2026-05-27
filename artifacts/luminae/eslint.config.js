import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/**
 * Returns the nearest enclosing "real" component function for a given AST node.
 *
 * Two kinds of non-component functions are skipped transparently:
 *
 * 1. Inline JSX attribute callbacks — `ref={(el) => { ... }}`, `onClick={...}`, etc.
 *    Their parent node is a `JSXExpressionContainer`, so they are attribute values,
 *    not component definitions.
 *
 * 2. IIFEs used inside JSX expressions — `{condition && (() => { return <div/> })()}`.
 *    The arrow/function expression is the `callee` of a `CallExpression` that is itself
 *    inside a JSX expression container.  These are just a way to use imperative code
 *    within JSX; the enclosing component function is the real scope owner.
 *
 * We keep walking until we find a function that is neither of these patterns.
 */
function getEnclosingComponentFunction(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      // Skip inline JSX attribute value callbacks (ref=, onClick=, etc.)
      const isInlineJsxHandler = current.parent?.type === 'JSXExpressionContainer';
      // Skip IIFEs: the function is the callee of an immediately-invoked CallExpression.
      const isIIFE =
        current.parent?.type === 'CallExpression' &&
        current.parent.callee === current;
      if (!isInlineJsxHandler && !isIIFE) return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Local ESLint rule: luminae/dialog-needs-focus-trap
 *
 * Every JSX element with `role="dialog"` must be rendered by a component that
 * calls `useFocusTrap(...)`.  Without the hook the dialog leaks keyboard focus
 * into the background, breaking accessibility.
 *
 * To opt out for a specific element (e.g. a Radix-managed dialog that traps
 * focus internally), add an inline disable comment:
 *   // eslint-disable-next-line luminae/dialog-needs-focus-trap
 */
const dialogNeedsFocusTrapRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every role="dialog" element must be in a component that calls useFocusTrap()',
      recommended: true,
    },
    messages: {
      missingFocusTrap:
        'Elements with role="dialog" require a useFocusTrap() call in the same component. ' +
        'See artifacts/luminae/CONVENTIONS.md (Dialog Focus-Trap Pattern) for the standard ' +
        'containerRef / useFocusTrap snippet and opt-out instructions. ' +
        'If focus is managed externally (e.g. Radix UI), suppress with an eslint-disable-next-line comment and explain why.',
    },
    schema: [],
  },

  create(context) {
    // Nodes of `useFocusTrap(...)` CallExpressions, keyed by enclosing component fn node.
    const componentFnsWithTrap = new Set();

    // role="dialog" attribute nodes together with their enclosing component fn.
    const dialogRoleAttrs = [];

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useFocusTrap'
        ) {
          const fn = getEnclosingComponentFunction(node);
          if (fn) componentFnsWithTrap.add(fn);
        }
      },

      JSXOpeningElement(node) {
        const roleAttr = node.attributes.find(
          (attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name?.name === 'role' &&
            attr.value?.type === 'Literal' &&
            attr.value.value === 'dialog',
        );
        if (!roleAttr) return;

        const fn = getEnclosingComponentFunction(node);
        dialogRoleAttrs.push({ attr: roleAttr, fn });
      },

      'Program:exit'() {
        for (const { attr, fn } of dialogRoleAttrs) {
          if (!fn || !componentFnsWithTrap.has(fn)) {
            context.report({ node: attr, messageId: 'missingFocusTrap' });
          }
        }
      },
    };
  },
};

/**
 * Local ESLint rule: luminae/no-dropdown-checkbox-item
 *
 * The settings menu communicates toggle state exclusively through icon
 * swapping or icon color changes (see the JSX comment around the header
 * settings menu in game.tsx).  Using DropdownMenuCheckboxItem adds a
 * redundant built-in checkbox indicator alongside the icon, creating a
 * double-indicator and breaking the established convention.
 *
 * If you genuinely need a checkbox-style item outside the settings menu
 * for a different purpose, suppress with an eslint-disable comment and
 * explain why.
 */
const noDropdownCheckboxItemRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow DropdownMenuCheckboxItem — use icon-swap or icon-color conventions instead',
      recommended: true,
    },
    messages: {
      noCheckboxItem:
        'Do not use <DropdownMenuCheckboxItem>. Communicate toggle state through icon ' +
        'swapping (e.g. VolumeX/Volume2) or icon color changes (e.g. text-yellow-400 vs ' +
        'text-muted-foreground) inside a plain <DropdownMenuItem>. ' +
        'See artifacts/luminae/CONVENTIONS.md for the full pattern guide and examples. ' +
        'If this use is intentional and a checkbox indicator is genuinely needed, suppress with an ' +
        'eslint-disable-next-line comment and explain why.',
    },
    schema: [],
  },

  create(context) {
    // Tracks local binding names that resolve to DropdownMenuCheckboxItem,
    // including aliased imports such as:
    //   import { DropdownMenuCheckboxItem as CheckItem } from '@/components/ui/dropdown-menu'
    const checkboxItemLocalNames = new Set(['DropdownMenuCheckboxItem']);

    return {
      ImportDeclaration(node) {
        if (node.source.value !== '@/components/ui/dropdown-menu') return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.name === 'DropdownMenuCheckboxItem' &&
            specifier.local.name !== 'DropdownMenuCheckboxItem'
          ) {
            checkboxItemLocalNames.add(specifier.local.name);
          }
        }
      },

      JSXOpeningElement(node) {
        const name = node.name;
        const elementName =
          name.type === 'JSXIdentifier'
            ? name.name
            : name.type === 'JSXMemberExpression'
              ? `${name.object.name}.${name.property.name}`
              : null;
        if (elementName !== null && checkboxItemLocalNames.has(elementName)) {
          context.report({ node, messageId: 'noCheckboxItem' });
        }
      },
    };
  },
};

export default [
  {
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tsPlugin,
      luminae: {
        rules: {
          'dialog-needs-focus-trap': dialogNeedsFocusTrapRule,
          'no-dropdown-checkbox-item': noDropdownCheckboxItemRule,
        },
      },
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
      // Enforce focus trapping on all role="dialog" elements.
      // Every component that renders role="dialog" must call useFocusTrap() so that
      // keyboard focus cannot escape into the background while the dialog is open.
      'luminae/dialog-needs-focus-trap': 'error',
      // Enforce the settings menu toggle convention: boolean settings communicate
      // their state via icon swapping or icon color changes, never via a built-in
      // checkbox indicator.  DropdownMenuCheckboxItem adds a redundant checkbox
      // alongside the icon, creating a double-indicator.  Use a plain
      // DropdownMenuItem with an icon that visually reflects state instead.
      'luminae/no-dropdown-checkbox-item': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];

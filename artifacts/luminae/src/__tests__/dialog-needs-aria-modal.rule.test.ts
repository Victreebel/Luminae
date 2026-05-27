// @vitest-environment node
/**
 * dialog-needs-aria-modal.rule.test.ts
 *
 * Unit tests for the `luminae/dialog-needs-aria-modal` ESLint rule.
 *
 * Uses ESLint's RuleTester to verify the rule:
 *   - Fires on JSX elements with role="dialog" that are missing aria-modal="true"
 *   - Stays silent on compliant code (string form, boolean form, no dialog role)
 *   - Respects inline eslint-disable-next-line suppression
 */

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import tsParser from '@typescript-eslint/parser';
import eslintConfig from '../../eslint.config.js';

// Wire RuleTester into Vitest so failures are reported as named test failures.
RuleTester.describe = describe as typeof RuleTester.describe;
RuleTester.it = it as typeof RuleTester.it;

// Extract the rule from the luminae plugin defined in eslint.config.js.
// eslint-config is a flat-config array; the first entry defines the plugin.
const lumiPlugin = (eslintConfig as Array<{ plugins?: Record<string, { rules?: Record<string, unknown> }> }>)[0]?.plugins?.['luminae'];
if (!lumiPlugin?.rules?.['dialog-needs-aria-modal']) {
  throw new Error(
    "Could not locate luminae/dialog-needs-aria-modal rule in eslint.config.js — check the plugin definition.",
  );
}
const rule = lumiPlugin.rules['dialog-needs-aria-modal'];

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('dialog-needs-aria-modal', rule as Parameters<typeof ruleTester.run>[1], {
  valid: [
    // ── String literal form ─────────────────────────────────────────────────
    {
      name: 'passes when aria-modal="true" (string literal) is present',
      code: `const C = () => <div role="dialog" aria-modal="true" />;`,
    },

    // ── Boolean expression form ─────────────────────────────────────────────
    {
      name: 'passes when aria-modal={true} (boolean expression) is present',
      code: `const C = () => <div role="dialog" aria-modal={true} />;`,
    },

    // ── Non-dialog elements are not checked ─────────────────────────────────
    {
      name: 'passes for an element without role="dialog" (no aria-modal needed)',
      code: `const C = () => <div aria-modal="true" />;`,
    },
    {
      name: 'passes for a role="alert" element without aria-modal',
      code: `const C = () => <div role="alert" />;`,
    },

    // ── Additional attributes alongside aria-modal="true" ───────────────────
    {
      name: 'passes with aria-label and other attributes alongside aria-modal="true"',
      code: `const C = () => <section role="dialog" aria-modal="true" aria-label="Settings" />;`,
    },

    // ── Inline suppress comment opt-out ─────────────────────────────────────
    // An eslint-disable-next-line comment on the line immediately before the
    // element (e.g. a Radix UI primitive that manages aria-modal internally)
    // must silence the rule for that element.
    //
    // NOTE: RuleTester registers the rule under the name
    // "rule-to-test/dialog-needs-aria-modal", so the disable comment must use
    // that name rather than "luminae/dialog-needs-aria-modal".  In real source
    // files the disable comment uses "luminae/dialog-needs-aria-modal" because
    // the rule is loaded via the luminae plugin under that namespace.
    {
      name: 'passes when rule is suppressed with an inline eslint-disable-next-line comment',
      code: [
        `const C = () => (`,
        `  // eslint-disable-next-line rule-to-test/dialog-needs-aria-modal`,
        `  <div role="dialog" />`,
        `);`,
      ].join('\n'),
    },
  ],

  invalid: [
    // ── Missing aria-modal entirely ─────────────────────────────────────────
    {
      name: 'fails when role="dialog" has no aria-modal attribute at all',
      code: `const C = () => <div role="dialog" />;`,
      errors: [{ messageId: 'missingAriaModal' }],
    },
    {
      name: 'fails when role="dialog" with aria-label but no aria-modal',
      code: `const C = () => <div role="dialog" aria-label="My panel" />;`,
      errors: [{ messageId: 'missingAriaModal' }],
    },

    // ── aria-modal set to a falsy or non-true value ──────────────────────────
    {
      name: 'fails when aria-modal="false" (string "false")',
      code: `const C = () => <div role="dialog" aria-modal="false" />;`,
      errors: [{ messageId: 'missingAriaModal' }],
    },
    {
      name: 'fails when aria-modal={false} (boolean false expression)',
      code: `const C = () => <div role="dialog" aria-modal={false} />;`,
      errors: [{ messageId: 'missingAriaModal' }],
    },

    // ── Multiple dialogs — one valid, one missing aria-modal ────────────────
    {
      name: 'reports exactly one error when one of two dialogs is missing aria-modal',
      code: [
        `const C = () => (`,
        `  <>`,
        `    <div role="dialog" aria-modal="true" />`,
        `    <div role="dialog" />`,
        `  </>`,
        `);`,
      ].join('\n'),
      errors: [{ messageId: 'missingAriaModal' }],
    },
    {
      name: 'reports two errors when two dialogs are both missing aria-modal',
      code: [
        `const C = () => (`,
        `  <>`,
        `    <div role="dialog" />`,
        `    <section role="dialog" />`,
        `  </>`,
        `);`,
      ].join('\n'),
      errors: [
        { messageId: 'missingAriaModal' },
        { messageId: 'missingAriaModal' },
      ],
    },
  ],
});

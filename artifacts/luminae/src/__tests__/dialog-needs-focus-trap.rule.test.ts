// @vitest-environment node
/**
 * dialog-needs-focus-trap.rule.test.ts
 *
 * Unit tests for the `luminae/dialog-needs-focus-trap` ESLint rule.
 *
 * Uses ESLint's RuleTester to verify the rule:
 *   - Fires on JSX elements with role="dialog" whose enclosing component does
 *     not call useFocusTrap()
 *   - Stays silent on compliant code (useFocusTrap present in same component)
 *   - Respects inline eslint-disable-next-line suppression
 *   - Correctly skips inline JSX attribute callbacks (ref=, onClick=, etc.)
 *     and IIFEs inside JSX expressions — these are transparent; the enclosing
 *     component is the real scope owner
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
if (!lumiPlugin?.rules?.['dialog-needs-focus-trap']) {
  throw new Error(
    "Could not locate luminae/dialog-needs-focus-trap rule in eslint.config.js — check the plugin definition.",
  );
}
const rule = lumiPlugin.rules['dialog-needs-focus-trap'];

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

ruleTester.run('dialog-needs-focus-trap', rule as Parameters<typeof ruleTester.run>[1], {
  valid: [
    // ── Component calls useFocusTrap — basic arrow function ──────────────────
    {
      name: 'passes when the component calls useFocusTrap() before the dialog element',
      code: [
        `const C = () => {`,
        `  useFocusTrap(containerRef, isOpen, onClose);`,
        `  return <div role="dialog" />;`,
        `};`,
      ].join('\n'),
    },

    // ── useFocusTrap with arguments ──────────────────────────────────────────
    {
      name: 'passes when useFocusTrap is called with a ref and boolean argument',
      code: [
        `const Modal = ({ open, onClose }) => {`,
        `  const ref = useRef(null);`,
        `  useFocusTrap(ref, open, onClose);`,
        `  return <div ref={ref} role="dialog" aria-modal="true" />;`,
        `};`,
      ].join('\n'),
    },

    // ── Function declaration style ───────────────────────────────────────────
    {
      name: 'passes for a function declaration component that calls useFocusTrap()',
      code: [
        `function Dialog() {`,
        `  useFocusTrap(ref, true, noop);`,
        `  return <div role="dialog" />;`,
        `}`,
      ].join('\n'),
    },

    // ── Non-dialog elements are not checked ─────────────────────────────────
    {
      name: 'passes for an element without role="dialog" (no useFocusTrap needed)',
      code: `const C = () => <div aria-modal="true" />;`,
    },
    {
      name: 'passes for a role="alert" element without useFocusTrap',
      code: `const C = () => <div role="alert" />;`,
    },

    // ── Inline callback (ref=) is transparent — enclosing component wins ─────
    // An inline arrow inside `ref={(el) => { ... }}` is NOT a component; the
    // rule must look through it to the enclosing component, which does have the
    // useFocusTrap call.
    {
      name: 'passes when useFocusTrap is in the enclosing component, dialog is in a ref callback',
      code: [
        `const C = () => {`,
        `  useFocusTrap(containerRef, isOpen, onClose);`,
        `  return (`,
        `    <div`,
        `      ref={(el) => { containerRef.current = el; }}`,
        `      role="dialog"`,
        `    />`,
        `  );`,
        `};`,
      ].join('\n'),
    },

    // ── IIFE inside JSX is transparent — enclosing component wins ────────────
    // An IIFE `{(() => { return <div role="dialog" /> })()}` is not a component;
    // the rule must look through it to the enclosing component.
    {
      name: 'passes when useFocusTrap is in the enclosing component, dialog is inside an IIFE',
      code: [
        `const C = () => {`,
        `  useFocusTrap(containerRef, isOpen, onClose);`,
        `  return (`,
        `    <div>`,
        `      {(() => <div role="dialog" />)()}`,
        `    </div>`,
        `  );`,
        `};`,
      ].join('\n'),
    },

    // ── Inline suppress comment opt-out ─────────────────────────────────────
    // An eslint-disable-next-line comment on the line immediately before the
    // element (e.g. a Radix UI primitive that traps focus internally) must
    // silence the rule for that element.
    //
    // NOTE: RuleTester registers the rule under the name
    // "rule-to-test/dialog-needs-focus-trap", so the disable comment must use
    // that name rather than "luminae/dialog-needs-focus-trap".  In real source
    // files the disable comment uses "luminae/dialog-needs-focus-trap" because
    // the rule is loaded via the luminae plugin under that namespace.
    {
      name: 'passes when rule is suppressed with an inline eslint-disable-next-line comment',
      code: [
        `const C = () => (`,
        `  // eslint-disable-next-line rule-to-test/dialog-needs-focus-trap`,
        `  <div role="dialog" />`,
        `);`,
      ].join('\n'),
    },
  ],

  invalid: [
    // ── No useFocusTrap call at all ──────────────────────────────────────────
    {
      name: 'fails when role="dialog" is in a component with no useFocusTrap call',
      code: `const C = () => <div role="dialog" />;`,
      errors: [{ messageId: 'missingFocusTrap' }],
    },

    // ── Has aria-modal but still no useFocusTrap ─────────────────────────────
    {
      name: 'fails even when aria-modal="true" is present but useFocusTrap is missing',
      code: `const C = () => <div role="dialog" aria-modal="true" />;`,
      errors: [{ messageId: 'missingFocusTrap' }],
    },

    // ── useFocusTrap only in a sibling component, not the rendering component ─
    {
      name: 'fails when useFocusTrap is called in a different (sibling) component',
      code: [
        `const A = () => {`,
        `  useFocusTrap(ref, true, noop);`,
        `  return <span />;`,
        `};`,
        `const B = () => <div role="dialog" />;`,
      ].join('\n'),
      errors: [{ messageId: 'missingFocusTrap' }],
    },

    // ── Multiple dialogs, one component with trap, one without ───────────────
    {
      name: 'reports exactly one error when one of two dialog-rendering components lacks useFocusTrap',
      code: [
        `const Good = () => {`,
        `  useFocusTrap(ref, open, onClose);`,
        `  return <div role="dialog" />;`,
        `};`,
        `const Bad = () => <section role="dialog" />;`,
      ].join('\n'),
      errors: [{ messageId: 'missingFocusTrap' }],
    },

    // ── Two dialogs in the same component without useFocusTrap ───────────────
    {
      name: 'reports two errors when one component renders two dialogs and has no useFocusTrap',
      code: [
        `const C = () => (`,
        `  <>`,
        `    <div role="dialog" />`,
        `    <section role="dialog" />`,
        `  </>`,
        `);`,
      ].join('\n'),
      errors: [
        { messageId: 'missingFocusTrap' },
        { messageId: 'missingFocusTrap' },
      ],
    },

    // ── Inline JSX callback edge case (role in callback, no trap in component) ─
    // An inline callback with role="dialog" inside it, but the enclosing
    // component never calls useFocusTrap — should still fail.
    {
      name: 'fails when role="dialog" is inside a ref callback but the enclosing component has no useFocusTrap',
      code: [
        `const C = () => (`,
        `  <div`,
        `    ref={(el) => { el?.setAttribute('data-x', '1'); }}`,
        `    role="dialog"`,
        `  />`,
        `);`,
      ].join('\n'),
      errors: [{ messageId: 'missingFocusTrap' }],
    },

    // ── IIFE edge case (role in IIFE, no trap in enclosing component) ─────────
    {
      name: 'fails when role="dialog" is inside an IIFE but the enclosing component has no useFocusTrap',
      code: [
        `const C = () => (`,
        `  <div>`,
        `    {(() => <section role="dialog" />)()}`,
        `  </div>`,
        `);`,
      ].join('\n'),
      errors: [{ messageId: 'missingFocusTrap' }],
    },
  ],
});

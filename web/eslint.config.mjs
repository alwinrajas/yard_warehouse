import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

/**
 * ALU TRACK lint configuration.
 *
 * The rules below are the build-enforced design constraints from
 * docs/26-component-architecture.md §9. Design systems decay through exceptions;
 * these make the common exceptions fail the build rather than accumulate.
 */
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'src/lib/design-tokens.generated.ts',
    ],
  },

  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // no-hex-literals — every colour must come from design-tokens/tokens.json.
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}){1,2}$/]',
          message:
            'Raw hex colours are not allowed. Add the value to design-tokens/tokens.json, regenerate, and use the token (docs/26 §9).',
        },
        {
          // no-raw-date-format — the browser timezone is not the yard timezone.
          selector:
            "MemberExpression[property.name=/^toLocale(Date|Time)?String$/]",
          message:
            'Use lib/format.ts. toLocaleString uses the browser timezone, which silently misreports "today" for any user outside the yard timezone (CFG-13).',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    // Layering rule: presentational components never reach into features or routes,
    // and never fetch data (docs/26 §1).
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/app/*', '../../features/*', '../../app/*'],
              message:
                'components/ must not import from features/ or app/. Presentation does not own data or screen composition (docs/26 §1).',
            },
          ],
        },
      ],
    },
  },

  {
    // lib/format.ts is the one place date formatting is allowed to happen.
    files: ['src/lib/format.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    // The gallery renders token swatches from CSS variables, and the review
    // fixtures are explicitly not production data.
    files: ['src/app/foundation/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
]

export default eslintConfig

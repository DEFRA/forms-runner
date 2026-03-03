import { defineConfig, globalIgnores } from 'eslint/config'
import prettierConfig from 'eslint-config-prettier'
import jest from 'eslint-plugin-jest'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import globals from 'globals'
import neostandard from 'neostandard'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // Global ignores
  globalIgnores([
    '.public',
    '.public/**',
    '.server',
    '.server/**',
    'coverage',
    'coverage/**'
  ]),

  // Base neostandard config (includes n, promise, import-x)
  ...neostandard({ ts: true, noStyle: true }),

  // Main override for all source files
  {
    files: ['**/*.{cjs,js,mjs,ts}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      jsdocPlugin.configs['flat/recommended']
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'no-console': 'error',
      'no-irregular-whitespace': [
        'error',
        {
          skipTemplates: true
        }
      ],

      // Check type imports are identified
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports'
        }
      ],

      // Allow void return shorthand in arrow functions
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        {
          ignoreArrowShorthand: true
        }
      ],

      // Only show warnings for missing types
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Check type support for template string implicit `.toString()`
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowBoolean: true,
          allowNumber: true
        }
      ],

      // Skip warnings for `this` in static methods
      '@typescript-eslint/unbound-method': [
        'warn',
        {
          ignoreStatic: true
        }
      ],

      // Skip rules handled by TypeScript compiler
      'import-x/default': 'off',
      'import-x/extensions': 'off',
      'import-x/named': 'off',
      'import-x/namespace': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-unresolved': 'off',

      // Check type imports are annotated inline
      'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],

      // Check import or require statements are A-Z ordered
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc' },
          named: {
            enabled: true,
            types: 'types-last'
          },
          'newlines-between': 'always'
        }
      ],

      // Check relative import paths use aliases
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./', '../'],
              message: "Please use '~/*' import alias instead."
            }
          ]
        }
      ],

      // Check for valid formatting
      'jsdoc/check-line-alignment': [
        'warn',
        'never',
        {
          tags: ['param', 'property', 'typedef', 'returns']
        }
      ],

      // Require hyphens before param description
      // Aligns with TSDoc style: https://tsdoc.org/pages/tags/param/
      'jsdoc/require-hyphen-before-param-description': [
        'warn',
        'always',
        {
          tags: {
            param: 'always',
            property: 'always',
            returns: 'never'
          }
        }
      ],

      // JSDoc blocks are optional but must be valid
      'jsdoc/require-jsdoc': [
        'error',
        {
          enableFixer: false,
          require: {
            FunctionDeclaration: false
          }
        }
      ],

      // JSDoc @param is optional
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-param': 'off',

      // JSDoc @returns is optional
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-returns': 'off',

      // Skip rules handled by TypeScript compiler
      'n/no-extraneous-require': 'off',
      'n/no-extraneous-import': 'off',
      'n/no-missing-require': 'off',
      'n/no-missing-import': 'off',

      // Prefer rules that are type aware
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-use-before-define': ['error', 'nofunc']
    }
  },

  // JS-specific override with recommended-typescript-flavor for JSDoc
  {
    files: ['**/*.{cjs,js,mjs}'],
    extends: [jsdocPlugin.configs['flat/recommended-typescript-flavor']],
    rules: {
      // Promise.prototype.catch() errors cannot be typed in JavaScript
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',

      // JSDoc blocks are optional but must be valid
      'jsdoc/require-jsdoc': [
        'error',
        {
          enableFixer: false,
          require: {
            FunctionDeclaration: false
          }
        }
      ],

      // JSDoc @param types are mandatory for JavaScript
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-param': 'off',

      // JSDoc @returns is optional
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-returns': 'off'
    }
  },

  // CJS override
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },

  // ESM override
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      sourceType: 'module'
    }
  },

  // Browser client code override
  {
    files: ['src/client/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      },
      sourceType: 'module'
    },
    rules: {
      // Turn off warnings for unavailable types
      // https://github.com/alphagov/govuk-frontend/issues/2835
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Allow floating promises for lazy loading
      '@typescript-eslint/no-floating-promises': 'off',
      'promise/always-return': 'off'
    }
  },

  // Jest test files override
  {
    files: ['**/*.test.{cjs,js,mjs,ts}'],
    ...jest.configs['flat/recommended'],
    ...jest.configs['flat/style'],
    plugins: {
      ...jest.configs['flat/recommended'].plugins
    },
    languageOptions: {
      globals: globals.jest
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      ...jest.configs['flat/style'].rules,

      // Turn off warnings for jest.Expect 'any' types
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Allow Jest to assert on mocked unbound methods
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error'
    }
  },

  // Prettier must be last
  prettierConfig
])

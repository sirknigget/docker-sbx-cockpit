import { defineConfig } from 'oxlint';

export default defineConfig({
  jsPlugins: [
    { name: 'anti-slop', specifier: 'oxlint-plugin-anti-slop' },
    { name: '@stylistic', specifier: '@stylistic/eslint-plugin' },
  ],
  rules: {
    '@stylistic/padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: 'import', next: '*' },
      { blankLine: 'any', prev: 'import', next: 'import' },
      { blankLine: 'always', prev: '*', next: ['const', 'let', 'var'] },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      {
        blankLine: 'any',
        prev: ['const', 'let', 'var'],
        next: ['const', 'let', 'var'],
      },
      {
        blankLine: 'always',
        prev: '*',
        next: ['function', 'class', 'interface', 'type'],
      },
      {
        blankLine: 'always',
        prev: ['function', 'class', 'interface', 'type'],
        next: '*',
      },
      {
        blankLine: 'always',
        prev: '*',
        next: ['return', 'if', 'for', 'while', 'switch', 'try'],
      },
      { blankLine: 'always', prev: 'block-like', next: '*' },
      { blankLine: 'always', prev: 'export', next: 'export' },
    ],
    '@stylistic/lines-between-class-members': [
      'error',
      {
        enforce: [
          { blankLine: 'always', prev: 'method', next: '*' },
          { blankLine: 'always', prev: '*', next: 'method' },
        ],
      },
    ],
    'anti-slop/cognitive-complexity': ['error', 12],
    'anti-slop/cyclomatic-complexity': ['error', { threshold: 10 }],
    'anti-slop/max-lines': ['error', { maximum: 500 }],
    'anti-slop/max-lines-per-function': ['error', { maximum: 50 }],
    'anti-slop/no-chained-type-assertions': 'error',
    'anti-slop/no-conditional-empty-object-spread': 'error',
    'anti-slop/no-known-value-widening': 'error',
    'anti-slop/no-module-mocking': 'error',
    'anti-slop/no-object-parameters': 'error',
    'anti-slop/no-reflect-apply': 'error',
    'anti-slop/no-reflect-get': 'error',
    'anti-slop/no-runtime-typeof': 'error',
    'anti-slop/no-shape-in-symbol-names': 'error',
    'anti-slop/no-unknown-parameters': 'error',
    'anti-slop/no-unknown-returns': 'error',
    'anti-slop/no-unknown-type-aliases': 'error',
    'anti-slop/no-unsafe-dictionary-type': 'error',
    'anti-slop/no-widen-then-assert': 'error',
    'anti-slop/require-safety-comment-for-type-assertion': 'error',
  },
});

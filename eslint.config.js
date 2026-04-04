import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        Blob: 'readonly',
        Gamepad: 'readonly',
        $: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-prototype-builtins': 'off',
      'no-undef': 'off' // TypeScript handles this
    }
  }
]

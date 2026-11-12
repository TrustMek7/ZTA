import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
export default ts.config(
  { ignores: ['dist/**', 'dist-backend/**', 'node_modules/**', '.aws-sam/**', '.tools/**', 'playwright-report/**', 'test-results/**', '.artifacts/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);

/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  '**/*.{ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '**/*.{js,mjs,cjs}': ['prettier --write'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
};

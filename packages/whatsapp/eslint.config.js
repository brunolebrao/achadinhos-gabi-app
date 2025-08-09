module.exports = {
  root: true,
  extends: ['@repo/eslint-config/base.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}
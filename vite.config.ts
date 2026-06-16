/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Relative base so the build works on a GitHub Pages project site
// (https://user.github.io/econflow/) without hardcoding the repo name.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'engine/**/*.test.ts'],
  },
});

// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    // No necesitas 'site' ni 'base' para Netlify a menos que ya tengas un dominio propio.
    output: 'static'
});
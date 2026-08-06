import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// If you deploy to GitHub Pages as a PROJECT site (username.github.io/repo-name),
// set base to '/repo-name/'. If it's a USER/ORG site (username.github.io) or
// you deploy to Vercel/Netlify, set base back to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/ToDoApp/',
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        affiliatedUnits: resolve(__dirname, 'affiliated-units.html'),
        playerRecord: resolve(__dirname, 'player-record.html'),
        registration: resolve(__dirname, 'registration.html'),
        reviews: resolve(__dirname, 'reviews.html'),
        spl: resolve(__dirname, 'spl.html'),
        team: resolve(__dirname, 'team.html'),
      },
    },
  },
});

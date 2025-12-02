import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Correctly map the system API_KEY to process.env.API_KEY for usage in the app
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Define a fallback for other process.env usage to prevent "process is not defined" error
      'process.env': {}
    }
  };
});
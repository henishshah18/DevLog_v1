import { defineConfig, type Plugin, type PluginOption, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Create an async function to load plugins
async function getPlugins(): Promise<PluginOption[]> {
  const plugins: PluginOption[] = [react()];
  
  try {
    // Dynamically import ESM plugins
    const { default: runtimeErrorOverlay } = await import("@replit/vite-plugin-runtime-error-modal");
    plugins.push(runtimeErrorOverlay());

    if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
      const cartographer = await import("@replit/vite-plugin-cartographer");
      plugins.push(cartographer.cartographer());
    }
  } catch (error) {
    console.warn("Warning: Some plugins failed to load:", error);
  }

  return plugins;
}

// Export an async config
export default defineConfig(async (): Promise<UserConfig> => {
  const rootDir = path.resolve(__dirname, "client");
  
  return {
    plugins: await getPlugins(),
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
        "@shared": path.resolve(__dirname, "./shared"),
        "@assets": path.resolve(__dirname, "./attached_assets"),
      },
      mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
      preserveSymlinks: true
    },
    root: rootDir,
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      target: 'esnext',
      commonjsOptions: {
        include: [/node_modules/],
        extensions: ['.js', '.cjs', '.mjs'],
        transformMixedEsModules: true
      },
      rollupOptions: {
        input: {
          main: path.resolve(rootDir, "index.html"),
          server: path.resolve(__dirname, "server/index.ts")
        },
        external: [
          'fsevents',
          /^node:.*$/,
        ],
        output: {
          format: 'es',
          entryFileNames: (chunkInfo: { name?: string }) => {
            return chunkInfo.name === 'server' ? 'server/[name].js' : 'assets/[name]-[hash].js';
          }
        }
      },
      sourcemap: true,
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
        supported: { 
          'top-level-await': true 
        },
      }
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});

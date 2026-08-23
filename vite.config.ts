import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Alias } from "vite";
import tailwindcss from "@tailwindcss/vite";

// kumo-ui's exports map doesn't resolve for bundlers (see itwas lesson) and we
// only want its stylesheet anyway — alias the real css file.
const kumoUiCss = path.resolve(
  import.meta.dirname,
  "node_modules/kumo-ui/dist/style.css",
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^kumo-ui\/styles\.css$/, replacement: kumoUiCss },
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
    ] satisfies Alias[],
  },
});

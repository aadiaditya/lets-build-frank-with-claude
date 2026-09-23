import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The build output is copied into Frank's image as /app/public and served by
// him at / (ADR-006), so assets are referenced relatively from the same origin.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});

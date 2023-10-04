import { resolve } from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/code.ts"), // エントリポイント
      name: "code", // グローバル変数として公開するライブラリの変数名
      fileName: "code", // 生成するファイルのファイル名を指定します。
      formats: ["es", "umd", "iife"], // 生成するモジュール形式を配列で指定します。デフォルトで['es', 'umd'] なのでこの場合はなくても大丈夫です。
    },
  },
  plugins: [],
});

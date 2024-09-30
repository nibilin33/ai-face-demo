import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { copy } from 'vite-plugin-copy';
import { viteStaticCopy as copy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), copy({
    targets: [
      { src: 'node_modules/onnxruntime-web/dist/*.wasm', dest: './' }
    ],
    hook: 'build', // 在构建时复制
    verbose: true, // 输出详细信息
  })],
})

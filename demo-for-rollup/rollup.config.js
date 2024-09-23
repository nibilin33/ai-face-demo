import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.ts', // 指定入口文件
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs', // CommonJS 格式
      plugins: [terser()] // 压缩代码
    },
    {
      file: 'dist/index.esm.js',
      format: 'es', // ES模块格式
      plugins: [terser()] // 压缩代码
    },{
      file: 'dist/index.umd.js',
      format: 'umd', // 通用模块格式
      name: 'aiFaceSdk', // UMD 模块名称
      plugins: [terser()] // 压缩代码
    }
  ],
  plugins: [
    resolve(), // 解析 node_modules 中的模块
    commonjs(), // 转换 CommonJS 模块为 ES6
    typescript(), // 使用 TypeScript 插件处理 TypeScript 文件
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env'],
    })
  ],
};
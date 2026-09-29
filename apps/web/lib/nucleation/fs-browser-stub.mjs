/**
 * Browser-condition stub for the `fs` import inside nucleation's
 * `diplomat-wasm.mjs`. The package's Node<22 fallback branch imports `fs`
 * to read the wasm from disk; Turbopack statically resolves that import
 * even for browser bundles, where `fs` does not exist. Turbopack's
 * `conditionNames: ["browser"]` swaps this stub in for client bundles,
 * while server bundles keep the real `fs` (both aliases are listed).
 *
 * The browser branch of diplomat-wasm.mjs uses
 * `WebAssembly.instantiateStreaming(fetch(cfg.wasm_path))` and never
 * touches this module.
 */
export default {}

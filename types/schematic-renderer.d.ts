declare module "schematic-renderer" {
  const SR: new (
    canvas: HTMLCanvasElement,
    options?: Record<string, unknown>,
    loader?: Record<string, unknown>
  ) => unknown
  export default SR
}

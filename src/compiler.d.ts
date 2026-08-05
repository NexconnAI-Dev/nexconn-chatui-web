// Kept alongside the source so declaration bundling and TypeDoc share these globals.
declare global {
  /**
   * Git commit ID used for the package build.
   */
  const __COMMIT_ID__: string;
  /**
   * Package version.
   */
  const __VERSION__: string;
  /**
   * Required engine version.
   */
  const __REQUIRED_ENGINE_VERSION__: string;
  /**
   * Development-build flag.
   */
  const __DEV__: boolean;

  declare module '*.svg?raw' {
    const content: string;
    export default content;
  }
}

export {};

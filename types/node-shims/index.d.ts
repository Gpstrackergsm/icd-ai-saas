declare module 'fs' {
  const fs: any;
  export = fs;
}

declare module 'path' {
  const path: any;
  export = path;
}

declare module 'node:test' {
  export function describe(...args: any[]): any;
  export function it(...args: any[]): any;
  export function before(...args: any[]): any;
}

declare module 'node:assert/strict' {
  const assert: any;
  export = assert;
}

declare const process: {
  cwd(): string;
  [key: string]: any;
};

/// <reference types="react" />

export {};

declare global {
  interface Window {
    parseCurrency?: (raw: any) => number;
  }

  function parseCurrency(raw: any): number;
}

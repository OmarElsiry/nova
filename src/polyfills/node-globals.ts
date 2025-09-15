import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;
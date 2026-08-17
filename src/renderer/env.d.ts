/// <reference types="vite/client" />
import type { ImproverApi } from '@shared/ipc-contract.js';

declare global {
  interface Window {
    improver: ImproverApi;
  }
}

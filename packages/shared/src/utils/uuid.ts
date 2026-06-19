// ponytail: crypto.randomUUID is native in Node 15.7+ and all browser secure
// contexts (https + localhost). No fallback needed.
export const uuid = (): string => crypto.randomUUID();

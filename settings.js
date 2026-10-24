import Schema from '@deepseek-ai/schemastery';
import { normalizeOptions } from './patch-core.js';

export const Config = Schema.object({
  autoExpand: Schema.boolean().default(true).description('输出时自动展开').volatile(),
  autoCollapse: Schema.boolean().default(true).description('结束后自动收起').volatile(),
});

export function readSettings(config) {
  return normalizeOptions({
    autoExpand: config.autoExpand.get(),
    autoCollapse: config.autoCollapse.get(),
  });
}

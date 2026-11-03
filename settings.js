import Schema from '@deepseek-ai/schemastery';
import { DEFAULT_MAX_LINES, MAX_MAX_LINES, MIN_MAX_LINES, normalizeOptions } from './patch-core.js';

export const Config = Schema.object({
  autoExpand: Schema.boolean().default(true).description('输出时自动展开').volatile(),
  autoCollapse: Schema.boolean().default(true).description('结束后自动收起').volatile(),
  limitHeight: Schema.boolean().default(true).description('自动展开时限制高度').volatile(),
  maxLines: Schema.number()
    .default(DEFAULT_MAX_LINES)
    .min(MIN_MAX_LINES)
    .max(MAX_MAX_LINES)
    .description('自动展开最多显示的行数')
    .volatile(),
  collapseAnimation: Schema.boolean().default(true).description('收起时播放动画').volatile(),
});

export function readSettings(config) {
  return normalizeOptions({
    autoExpand: config.autoExpand.get(),
    autoCollapse: config.autoCollapse.get(),
    limitHeight: config.limitHeight.get(),
    maxLines: config.maxLines.get(),
    collapseAnimation: config.collapseAnimation.get(),
  });
}

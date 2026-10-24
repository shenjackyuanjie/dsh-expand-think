import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Script } from 'node:vm';
import { patchSource, supportedVersion, targetModule } from './patch-core.js';
import { Config } from './settings.js';

export { Config };
export const name = 'dsh-expand-think';
export const inject = ['clientModules', 'settings'];

// 原子替换，防止 HMR 读取半截文件；只编译检查，不运行浏览器代码。
function replaceFile(target, before, after) {
  if (before === after) return false;
  new Script(after, { filename: target });
  const temporary = target + '.' + name + '-' + randomUUID() + '.tmp';
  let pending = false;
  try {
    writeFileSync(temporary, after, { flag: 'wx' });
    pending = true;
    if (readFileSync(target, 'utf8') !== before) {
      throw new Error('前端文件在检查期间发生了其他修改，本次未覆盖。');
    }
    renameSync(temporary, target);
    pending = false;
    return true;
  } finally {
    if (pending) unlinkSync(temporary);
  }
}

function validateTarget(target) {
  const manifest = JSON.parse(readFileSync(resolve(dirname(target), '../package.json'), 'utf8'));
  if (manifest.name !== targetModule || manifest.version !== supportedVersion) {
    throw new Error(
      '仅支持 ' + targetModule + '@' + supportedVersion + '；当前目标不匹配，请重新适配。',
    );
  }
}

/** 由 DSH 管理生命周期：启用应用、停用反向撤销，并发布前端新版本。 */
export function apply(ctx) {
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber));
  ctx.effect(() => {
    const modules = ctx.clientModules;
    const managed = new Set();
    let synchronizing = false;
    let active = true;

    const synchronize = () => {
      if (!active || synchronizing) return;
      const target = modules.clientPath(targetModule);
      if (target === undefined) return;
      synchronizing = true;
      try {
        validateTarget(target);
        const before = readFileSync(target, 'utf8');
        const after = patchSource(before);
        // rebuilt() 同步发布 graph 变化；先记录所有权，回调重入不会重复写入。
        const changed = replaceFile(target, before, after);
        managed.add(target);
        if (changed) modules.rebuilt(targetModule);
      } finally {
        synchronizing = false;
      }
    };

    const unsubscribe = modules.onGraphChanged(() => {
      try {
        synchronize();
      } catch (error) {
        ctx.logger.warn('思考自动展开补丁未更新：' + error.message);
      }
    });
    const restore = () => {
      active = false;
      unsubscribe();
      for (const target of managed) {
        try {
          const before = readFileSync(target, 'utf8');
          const after = patchSource(before, true);
          if (replaceFile(target, before, after)) modules.rebuilt(targetModule);
        } catch (error) {
          // 不以旧文件覆盖其他插件或用户后续修改；诊断保留在 DSH 日志。
          ctx.logger.warn('思考自动展开补丁未能自动还原：' + error.message);
        }
      }
      managed.clear();
    };
    try {
      synchronize();
    } catch (error) {
      restore();
      throw error;
    }
    return restore;
  });
}

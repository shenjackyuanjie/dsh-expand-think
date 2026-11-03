window.__ModuleLoader__.load({
  id: '@shenjackyuanjie/dsh-expand-think',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const bundleKey = '@shenjackyuanjie/dsh-expand-think';
    const namespace = 'dsh-expand-think';
    const labels = {
      title: '思考显示设置',
      summary: '分别控制 thinking 输出时展开和结束后收起。',
      autoExpand: '输出时自动展开',
      autoExpandHint: '每段 thinking 开始输出时展开正文；输出中仍可手动收起。',
      autoCollapse: '结束后自动收起',
      autoCollapseHint: 'thinking 转为回答、工具调用或结束时收起；关闭后保留当前开合状态。',
      limitHeight: '自动展开时限制高度',
      limitHeightHint:
        '自动展开时正文只显示固定行数，超出的部分在正文内滚动；手动点开时始终完整展开。',
      maxLines: '最多显示行数',
      maxLinesHint: '自动展开时正文最多显示的行数，可填 3–60。',
      collapseAnimation: '收起时播放动画',
      collapseAnimationHint: '思考结束收起时按线性动画收拢；关闭后立即收起。',
      hint: '默认均开启。修改后点击保存；设置保存在当前 profile，从下一次思考状态切换起使用，不重载聊天界面。',
      save: '保存设置',
      saving: '保存中…',
      saved: '设置已保存',
      discard: '放弃修改',
      loading: '正在读取设置…',
      unavailable: '设置暂不可用，请确认插件已启用。',
      readOnly: '当前 profile 的设置为只读。',
      failed: '保存未成功，修改已保留。设置可能已在其他页面更改，请重新载入后再试。',
    };
    // 只作用于自动展开的正文容器；稳定类名由 Host 侧的文本补丁写入。
    const clampCss = `[data-dsh-et-clamped] .dsh-et-body{max-height:var(--dsh-et-max-height);overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}[data-dsh-et-closing] .dsh-et-body{overflow:hidden;animation:dsh-et-collapse 240ms linear forwards}@keyframes dsh-et-collapse{from{max-height:var(--dsh-et-open-height,480px);opacity:1}to{max-height:0;opacity:0}}`;
    const clampDefaults = {
      autoExpand: true,
      autoCollapse: true,
      limitHeight: true,
      maxLines: 9,
      collapseAnimation: true,
    };
    const clampTextField = 'maxLines';
    const booleanFields = ['autoExpand', 'autoCollapse', 'limitHeight', 'collapseAnimation'];

    // 行高单位 lh 只在较新浏览器可用，不支持时按 1.7 倍字号近似。
    function syncClampHeight(values) {
      if (typeof document === 'undefined') return;
      const settings = values ?? clampDefaults;
      const lines = Number.isInteger(settings.maxLines)
        ? settings.maxLines
        : clampDefaults.maxLines;
      const enabled = settings.limitHeight !== false;
      const unit = globalThis.CSS?.supports?.('max-height', '1lh') ? '1lh' : '1.7em';
      document.documentElement.style.setProperty(
        '--dsh-et-max-height',
        enabled ? `calc(${lines} * ${unit} + 8px)` : 'none',
      );
    }

    function installClampStyle() {
      const tagId = '@shenjackyuanjie/dsh-expand-think/clamp';
      if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {
        const tag = document.createElement('style');
        tag.dataset.plugin = bundleKey;
        tag.dataset.pluginCss = tagId;
        tag.textContent = clampCss;
        document.head.appendChild(tag);
      }
      return () => {
        document
          .querySelectorAll('style[data-plugin-css=' + JSON.stringify(tagId) + ']')
          .forEach((tag) => tag.remove());
        document.documentElement.style.removeProperty('--dsh-et-max-height');
      };
    }
    const css = `
.dsh-et-settings{margin:24px 0 32px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6}
.dsh-et-settings h3{margin:0 0 4px;font-size:16px;font-weight:600}
.dsh-et-hint{margin:4px 0 12px;color:var(--dsw-alias-label-secondary);font-size:13px}
.dsh-et-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsh-et-label{font-weight:500}.dsh-et-detail{margin-top:4px;color:var(--dsw-alias-label-secondary);font-size:13px}
.dsh-et-switch{position:relative;flex:none;width:38px;height:22px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-2);cursor:pointer}
.dsh-et-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-secondary)}
.dsh-et-switch[aria-checked=true]{background:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary)}
.dsh-et-switch[aria-checked=true]::after{transform:translateX(16px);background:var(--dsw-alias-bg-base)}
.dsh-et-switch:focus-visible,.dsh-et-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.dsh-et-switch:disabled,.dsh-et-button:disabled{opacity:.45;cursor:not-allowed}
.dsh-et-footer{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px}
.dsh-et-button{font:inherit;line-height:20px;padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}
.dsh-et-button-primary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);border-color:var(--dsw-alias-label-primary)}
.dsh-et-status{color:var(--dsw-alias-label-secondary);font-size:13px}.dsh-et-error{margin-top:12px;color:var(--dsw-alias-state-error-primary);font-size:13px}
.dsh-et-number{width:88px;font:inherit;line-height:20px;padding:6px 10px;text-align:center;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-et-number:disabled{opacity:.45}
`;

    // 纯数据操作，保存时一次提交全部字段，并带上开始编辑时的版本号。
    function createDraft(snapshot, field, value, previous) {
      const values = previous?.values ?? snapshot.value ?? clampDefaults;
      if (field === clampTextField) {
        if (!Number.isInteger(value) || value < 3 || value > 60)
          throw new Error('最多显示行数必须是 3–60 的整数。');
      } else if (booleanFields.includes(field)) {
        if (typeof value !== 'boolean') throw new Error('无效设置项。');
      } else {
        throw new Error('无效设置项。');
      }
      return {
        revision: previous?.revision ?? snapshot.revision,
        values: { ...values, [field]: value },
      };
    }
    function operations(values) {
      const ops = booleanFields.map((field) => {
        if (typeof values[field] !== 'boolean') throw new Error('设置必须是布尔值。');
        return { op: 'set', path: [field], value: values[field] };
      });
      const lines = values[clampTextField];
      if (!Number.isInteger(lines) || lines < 3 || lines > 60) {
        throw new Error('最多显示行数必须是 3–60 的整数。');
      }
      ops.push({ op: 'set', path: [clampTextField], value: lines });
      return ops;
    }

    // 插件自有的只读状态桥接。读取原生表单镜像，不复制配置，不写宿主 DOM。
    function installRuntimeBridge(form) {
      const key = Symbol.for('dsh-expand-think/runtime');
      const bridge = {
        getOptions() {
          const snapshot = form.getSnapshot();
          if (snapshot.status !== 'ready') return undefined;
          // 每次思考状态切换顺带同步高度，关闭设置页后保存的值也能生效。
          syncClampHeight(snapshot.value);
          return snapshot.value;
        },
      };
      globalThis[key] = bridge;
      try {
        syncClampHeight(form.getSnapshot().value);
      } catch {
        /* 快照不可用时保持默认高度，不影响原生 Chat。 */
      }
      return () => {
        if (globalThis[key] === bridge) delete globalThis[key];
      };
    }

    function SettingsPage({ view, useSettings, saveSettings, t }) {
      const snapshot = useSettings((state) => state);
      const [draft, setDraft] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [message, setMessage] = React.useState('');
      const [error, setError] = React.useState(false);
      const alive = React.useRef(true);
      React.useEffect(() => {
        alive.current = true;
        return () => {
          alive.current = false;
        };
      }, []);
      if (view === 'summary') return t('summary');
      const status = snapshot.status;
      const ready = status === 'ready' && snapshot.value !== undefined;
      const disabled = busy || !ready || !snapshot.writable;
      const values = draft?.values ?? snapshot.value ?? clampDefaults;
      const dirty =
        draft !== null &&
        [...booleanFields, clampTextField].some(
          (field) => draft.values[field] !== snapshot.value?.[field],
        );
      const edit = (field) => {
        setDraft((previous) => createDraft(snapshot, field, !values[field], previous));
        setMessage('');
        setError(false);
      };
      const editNumber = (raw) => {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 3 || value > 60) return;
        setDraft((previous) => createDraft(snapshot, clampTextField, value, previous));
        setMessage('');
        setError(false);
      };
      const save = async () => {
        if (disabled || !dirty || draft === null) return;
        setBusy(true);
        setMessage('');
        setError(false);
        try {
          const accepted = await saveSettings(operations(draft.values), draft.revision);
          if (!alive.current) return;
          if (accepted) {
            setDraft(null);
            setMessage(t('saved'));
            syncClampHeight(draft.values);
          } else {
            setMessage(t('failed'));
            setError(true);
          }
        } catch {
          if (alive.current) {
            setMessage(t('failed'));
            setError(true);
          }
        } finally {
          if (alive.current) setBusy(false);
        }
      };
      const row = (field) =>
        h(
          'div',
          { className: 'dsh-et-row', key: field },
          h(
            'div',
            null,
            h('div', { id: 'dsh-et-' + field, className: 'dsh-et-label' }, t(field)),
            h(
              'div',
              { id: 'dsh-et-' + field + '-hint', className: 'dsh-et-detail' },
              t(field + 'Hint'),
            ),
          ),
          h('button', {
            type: 'button',
            className: 'dsh-et-switch',
            role: 'switch',
            'aria-checked': values[field],
            'aria-labelledby': 'dsh-et-' + field,
            'aria-describedby': 'dsh-et-' + field + '-hint',
            disabled,
            onClick: () => edit(field),
          }),
        );
      const numberRow = () =>
        h(
          'div',
          { className: 'dsh-et-row', key: clampTextField },
          h(
            'div',
            null,
            h(
              'label',
              {
                id: 'dsh-et-maxLines',
                htmlFor: 'dsh-et-maxLines-input',
                className: 'dsh-et-label',
              },
              t('maxLines'),
            ),
            h('div', { id: 'dsh-et-maxLines-hint', className: 'dsh-et-detail' }, t('maxLinesHint')),
          ),
          h('input', {
            id: 'dsh-et-maxLines-input',
            type: 'number',
            className: 'dsh-et-number',
            min: 3,
            max: 60,
            step: 1,
            inputMode: 'numeric',
            value: values[clampTextField],
            'aria-labelledby': 'dsh-et-maxLines',
            'aria-describedby': 'dsh-et-maxLines-hint',
            disabled,
            onChange: (event) => editNumber(event.target.value),
          }),
        );
      return h(
        'section',
        { className: 'dsh-et-settings', 'aria-label': t('title') },
        h('style', null, css),
        h('h3', null, t('title')),
        h(
          'p',
          { className: 'dsh-et-hint' },
          ready ? t('hint') : t(status === 'loading' ? 'loading' : 'unavailable'),
        ),
        ready && row('autoExpand'),
        ready && row('autoCollapse'),
        ready && row('limitHeight'),
        ready && values.limitHeight && numberRow(),
        ready && row('collapseAnimation'),
        ready && !snapshot.writable && h('p', { className: 'dsh-et-hint' }, t('readOnly')),
        ready &&
          h(
            'div',
            { className: 'dsh-et-footer' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-et-button dsh-et-button-primary',
                disabled: disabled || !dirty,
                onClick: save,
              },
              t(busy ? 'saving' : 'save'),
            ),
            draft &&
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-et-button',
                  disabled: busy,
                  onClick: () => {
                    setDraft(null);
                    setMessage('');
                    setError(false);
                  },
                },
                t('discard'),
              ),
            !error && message && h('span', { role: 'status', className: 'dsh-et-status' }, message),
          ),
        error && h('div', { role: 'alert', className: 'dsh-et-error' }, message),
      );
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(namespace, { zh: labels, en: labels }));
        ctx.effect(() => installClampStyle());
        const form = ctx.configForms.get(namespace);
        ctx.effect(() => installRuntimeBridge(form));
        ctx.slots.inject('plugins.bundle.config', () =>
          ctx.slots.register(
            {
              name: 'plugins.bundle.config',
              key: bundleKey,
              locale: namespace,
              inject: () => ({
                hooks: { settings: form },
                saveSettings: (ops, revision) => form.mutate(ops, revision),
              }),
            },
            SettingsPage,
          ),
        );
      },
    };
  },
});

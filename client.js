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
`;

    // 纯数据操作，保存时一次提交两个字段，并带上开始编辑时的版本号。
    function createDraft(snapshot, field, checked, previous) {
      if (!['autoExpand', 'autoCollapse'].includes(field) || typeof checked !== 'boolean')
        throw new Error('无效设置项。');
      const values = previous?.values ?? snapshot.value ?? { autoExpand: true, autoCollapse: true };
      return {
        revision: previous?.revision ?? snapshot.revision,
        values: { ...values, [field]: checked },
      };
    }
    function operations(values) {
      return ['autoExpand', 'autoCollapse'].map((field) => {
        if (typeof values[field] !== 'boolean') throw new Error('设置必须是布尔值。');
        return { op: 'set', path: [field], value: values[field] };
      });
    }

    // 插件自有的只读状态桥接。读取原生表单镜像，不复制配置，不写宿主 DOM。
    function installRuntimeBridge(form) {
      const key = Symbol.for('dsh-expand-think/runtime');
      const bridge = {
        getOptions() {
          const snapshot = form.getSnapshot();
          return snapshot.status === 'ready' ? snapshot.value : undefined;
        },
      };
      globalThis[key] = bridge;
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
      const values = draft?.values ?? snapshot.value ?? { autoExpand: true, autoCollapse: true };
      const dirty =
        draft !== null &&
        ['autoExpand', 'autoCollapse'].some(
          (field) => draft.values[field] !== snapshot.value?.[field],
        );
      const edit = (field) => {
        setDraft((previous) => createDraft(snapshot, field, !values[field], previous));
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

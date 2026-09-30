import { useState } from 'react';
import { agents, resultSchema } from '../shared/contracts';
import { api } from './api';
import { Modal } from './ui';
export function CreateSandboxDialog({
  onClose,
  onCreated,
  template,
}: {
  onClose: () => void;
  onCreated: () => void;
  template?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(form: HTMLFormElement) {
    const values = new FormData(form);
    const workspaces = String(values.get('workspaces'))
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
    setBusy(true);
    setError('');
    try {
      await api(
        '/sandboxes',
        resultSchema,
        'POST',
        JSON.stringify({
          name: values.get('name'),
          agent: values.get('agent'),
          workspaces,
          template: values.get('template') || undefined,
        }),
      );
      onCreated();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to create sandbox',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Create sandbox" onClose={onClose}>
      <p className="muted">A fresh, isolated environment on this machine.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        <label>
          Name
          <input
            name="name"
            required
            minLength={2}
            pattern="[a-zA-Z0-9][a-zA-Z0-9.-]+"
            placeholder="my-project"
            autoFocus
          />
        </label>
        <label>
          Agent
          <select name="agent">
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent === 'shell' ? 'Pure shell (Bash)' : agent}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workspace mounts
          <textarea
            name="workspaces"
            rows={3}
            placeholder={
              '/absolute/path/to/project\n/absolute/path/to/reference:ro'
            }
          />
          <small>
            One absolute host path per line. Add :ro for read-only. Leave empty
            for no mounts.
          </small>
        </label>
        <label>
          Template (optional)
          <input
            name="template"
            defaultValue={template}
            placeholder="repository:tag"
          />
          <small>
            Saved templates use sbx’s local image store (--pull never).
          </small>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Creating sandbox…' : 'Create sandbox'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { resultSchema, type Sandbox } from '../shared/contracts';
import { api } from './api';
import { Modal } from './ui';

export interface PendingAction {
  sandbox: Sandbox;
  action: 'stop' | 'delete';
}

export function LifecycleAction({
  pending,
  onClose,
  onCompleted,
}: {
  pending: PendingAction;
  onClose: () => void;
  onCompleted: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);

    try {
      await api(
        `/sandboxes/${encodeURIComponent(pending.sandbox.name)}${pending.action === 'stop' ? '/stop' : ''}`,
        resultSchema,
        pending.action === 'stop' ? 'POST' : 'DELETE',
      );
      onCompleted(
        `${pending.sandbox.name} ${pending.action === 'stop' ? 'stopped' : 'deleted'}`,
      );
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`${pending.action === 'delete' ? 'Delete' : 'Stop'} ${pending.sandbox.name}?`}
      onClose={onClose}
    >
      <p className="muted">
        {pending.action === 'delete'
          ? 'This removes the sandbox, its internal files and scoped secrets. Host workspace files are retained. This cannot be undone.'
          : 'The sandbox will retain its files and configuration. Executing a command starts it again.'}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className={pending.action === 'delete' ? 'destructive' : 'primary'}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy
            ? 'Working…'
            : pending.action === 'delete'
              ? 'Delete sandbox'
              : 'Stop sandbox'}
        </button>
      </div>
    </Modal>
  );
}

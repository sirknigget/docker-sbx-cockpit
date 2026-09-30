import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { resultSchema, type Sandbox } from '../shared/contracts';
import { api } from './api';
import { Modal } from './ui';
import './configuration.css';

export function useInventory<T>(path: string, schema: z.ZodType<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);

    try {
      setData(await api(path, schema));
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to load inventory',
      );
    } finally {
      setBusy(false);
    }
  }, [path, schema]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function mutate(method: string, body: string) {
    setBusy(true);

    try {
      await api(path, resultSchema, method, body);
      await refresh();

      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Operation failed');

      return false;
    } finally {
      setBusy(false);
    }
  }

  return { data, error, busy, refresh, mutate };
}

interface ConfirmProps {
  title: string;
  description: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDelete(props: ConfirmProps) {
  return (
    <Modal title={props.title} onClose={props.onClose}>
      <p className="muted">{props.description}</p>
      <div className="form-actions">
        <button disabled={props.busy} onClick={props.onClose}>
          Cancel
        </button>
        <button
          className="destructive"
          disabled={props.busy}
          onClick={props.onConfirm}
        >
          {props.busy ? 'Removing…' : 'Confirm deletion'}
        </button>
      </div>
    </Modal>
  );
}

interface ScopeProps {
  sandboxes: Sandbox[];
  registry?: boolean;
}

export function ScopeField(props: ScopeProps) {
  return (
    <label>
      Scope
      <select name="scope" defaultValue={props.registry ? 'host' : 'global'}>
        {props.registry && <option value="host">Host only</option>}
        <option value="global">All sandboxes (global)</option>
        {props.sandboxes.map((sandbox) => (
          <option key={sandbox.name} value={sandbox.name}>
            {sandbox.name}
          </option>
        ))}
      </select>
    </label>
  );
}

interface StateProps {
  error: string;
  busy: boolean;
  label: string;
  onRefresh: () => void;
}

export function InventoryState(props: StateProps) {
  return (
    <>
      <div className="inventory-refresh">
        <button
          aria-label={`Refresh ${props.label}`}
          disabled={props.busy}
          onClick={props.onRefresh}
        >
          <RefreshCw size={14} />
          Refresh {props.label}
        </button>
      </div>
      {props.error && (
        <p role="alert" className="error-banner">
          {props.error}
        </p>
      )}
      {props.busy && (
        <p role="status" className="muted">
          Working…
        </p>
      )}
    </>
  );
}

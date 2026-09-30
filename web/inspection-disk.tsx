import { useState, type FormEvent } from 'react';
import { diskSchema, type DiskUsage } from '../shared/inspection';
import { api } from './api';
import { bytes } from './ui';
import './inspection.css';

export function SandboxDisk({
  sandbox,
  onStarted,
}: {
  sandbox: string;
  onStarted?: () => void;
}) {
  const [path, setPath] = useState('/');
  const [usage, setUsage] = useState<DiskUsage>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function check(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      setUsage(
        await api(
          `/sandboxes/${encodeURIComponent(sandbox)}/disk?path=${encodeURIComponent(path)}`,
          diskSchema,
        ),
      );
      onStarted?.();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to inspect disk usage',
      );
    } finally {
      setBusy(false);
    }
  }

  const total =
    usage?.entries.find((entry) => entry.path === usage.path)?.size ?? 1;

  return (
    <section className="inspection-pane">
      <p className="muted">
        Measure the directory and its largest immediate children on the same
        filesystem. Scans have a 60-second limit and start a stopped sandbox.
      </p>
      <form className="inspection-path" onSubmit={(event) => void check(event)}>
        <label>
          Sandbox path
          <input
            required
            pattern="/.*"
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />
        </label>
        <button disabled={busy}>
          {busy ? 'Scanning…' : 'Check disk usage'}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {usage && (
        <>
          <div className="disk-summary">
            <div>
              <small>Filesystem used</small>
              <strong>
                {bytes(usage.filesystem.used)} / {bytes(usage.filesystem.total)}
              </strong>
            </div>
            <div>
              <small>Available</small>
              <strong>{bytes(usage.filesystem.available)}</strong>
            </div>
            <div>
              <small>Mount</small>
              <strong>
                {usage.filesystem.mount} · {usage.filesystem.percent}
              </strong>
            </div>
          </div>
          {usage.partial && (
            <p role="status" className="error">
              Some paths could not be read. These totals are partial.
            </p>
          )}
          <h3>
            Largest directories in <code>{usage.path}</code>
          </h3>
          <div className="disk-map" aria-label="Directory disk usage">
            {usage.entries.map((entry) => (
              <div className="disk-entry" key={entry.path}>
                <div>
                  <code>{entry.path}</code>
                  <span>{bytes(entry.size)}</span>
                </div>
                <div className="disk-track">
                  <span
                    style={{
                      width: `${Math.min(100, (entry.size / Math.max(total, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="muted">
            Showing up to 20 child directories plus the scanned directory.
            Change the path to inspect a large directory more closely.
          </p>
        </>
      )}
    </section>
  );
}

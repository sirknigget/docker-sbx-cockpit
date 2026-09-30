import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowUp, FileText, Folder, Link } from 'lucide-react';
import {
  directorySchema,
  fileSchema,
  type Directory,
  type SandboxFile,
} from '../shared/inspection';
import { api } from './api';
import { bytes } from './ui';
import './inspection.css';

export function SandboxFiles({
  sandbox,
  onStarted,
}: {
  sandbox: string;
  onStarted?: () => void;
}) {
  const [path, setPath] = useState('/');
  const [directory, setDirectory] = useState<Directory>();
  const [file, setFile] = useState<SandboxFile>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/sandboxes/${encodeURIComponent(sandbox)}`;
  const browse = useCallback(
    async (target: string) => {
      setBusy(true);
      setError('');
      setFile(undefined);

      try {
        const result = await api(
          `${base}/files?path=${encodeURIComponent(target)}`,
          directorySchema,
        );

        setDirectory(result);
        setPath(result.path);
        onStarted?.();
      } catch (failure) {
        setError(
          failure instanceof Error ? failure.message : 'Unable to browse files',
        );
      } finally {
        setBusy(false);
      }
    },
    [base, onStarted],
  );

  useEffect(() => {
    void browse('/');
  }, [browse]);

  async function view(target: string) {
    setBusy(true);
    setError('');
    setFile(undefined);

    try {
      setFile(
        await api(
          `${base}/file?path=${encodeURIComponent(target)}`,
          fileSchema,
        ),
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to view file',
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void browse(path);
  }

  return (
    <section className="inspection-pane">
      <p className="muted">
        Browse folders and UTF-8 text files up to 1 MiB. Browsing starts a
        stopped sandbox.
      </p>
      <form className="inspection-path" onSubmit={submit}>
        <label>
          Sandbox path
          <input
            value={path}
            onChange={(event) => setPath(event.target.value)}
            required
            pattern="/.*"
          />
        </label>
        <button disabled={busy} type="submit">
          {busy ? 'Loading…' : 'Browse'}
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {directory && (
        <div className="file-browser">
          <div className="inspection-heading">
            <code>{directory.path}</code>
            <button
              disabled={busy || directory.path === '/'}
              onClick={() =>
                void browse(
                  directory.path
                    .replace(/\/+$/, '')
                    .split('/')
                    .slice(0, -1)
                    .join('/') || '/',
                )
              }
            >
              <ArrowUp size={14} /> Parent folder
            </button>
          </div>
          <div className="file-list" role="list" aria-label="Directory entries">
            {directory.entries.map((entry) => (
              <button
                className="file-row"
                role="listitem"
                key={entry.name}
                disabled={busy || !['directory', 'file'].includes(entry.kind)}
                onClick={() => {
                  const target = `${directory.path.replace(/\/+$/, '')}/${entry.name}`;

                  void (entry.kind === 'directory'
                    ? browse(target)
                    : view(target));
                }}
              >
                {entry.kind === 'directory' ? (
                  <Folder size={17} />
                ) : entry.kind === 'symlink' ? (
                  <Link size={17} />
                ) : (
                  <FileText size={17} />
                )}
                <span>{entry.name}</span>
                <small>
                  {entry.kind === 'directory'
                    ? 'Folder'
                    : entry.kind === 'file'
                      ? bytes(entry.size)
                      : entry.kind}
                </small>
              </button>
            ))}
            {directory.entries.length === 0 && (
              <p className="empty">This folder is empty.</p>
            )}
          </div>
          {directory.truncated && (
            <p className="muted">
              Showing the first 500 entries. Browse a narrower folder to see
              more.
            </p>
          )}
        </div>
      )}
      {file && (
        <div className="file-viewer">
          <div className="inspection-heading">
            <code>{file.path}</code>
            <small>{bytes(file.size)}</small>
          </div>
          <pre tabIndex={0} aria-label="File contents">
            {file.content || '(Empty file)'}
          </pre>
        </div>
      )}
    </section>
  );
}

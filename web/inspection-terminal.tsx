import { useEffect, useRef, useState, type FormEvent } from 'react';
import { terminalSchema, type TerminalState } from '../shared/inspection';
import { resultSchema } from '../shared/contracts';
import { api } from './api';
import './inspection.css';
export function SandboxTerminal({
  sandbox,
  onStarted,
}: {
  sandbox: string;
  onStarted?: () => void;
}) {
  const [session, setSession] = useState<TerminalState>();
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cursor = useRef(0);
  const viewer = useRef<HTMLPreElement>(null);
  const base = `/sandboxes/${encodeURIComponent(sandbox)}/terminal`;
  function append(state: TerminalState) {
    cursor.current = state.cursor;
    setOutput((previous) =>
      `${state.dropped ? '[Earlier output discarded]\n' : previous}${state.output}`.slice(
        -256 * 1024,
      ),
    );
    setSession(state);
  }
  useEffect(() => {
    viewer.current?.scrollTo(0, viewer.current.scrollHeight);
  }, [output]);
  useEffect(() => {
    if (!session?.active) return;
    let cancelled = false;
    let pending = false;
    const timer = window.setInterval(() => {
      if (pending) return;
      pending = true;
      void api(`${base}/${session.id}?cursor=${cursor.current}`, terminalSchema)
        .then((state) => {
          if (!cancelled) append(state);
        })
        .catch((failure: Error) => {
          if (cancelled) return;
          setError(failure.message);
          if (failure.message === 'Terminal session not found')
            setSession(undefined);
        })
        .finally(() => {
          pending = false;
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [base, session?.id, session?.active]);
  useEffect(() => {
    const id = session?.id;
    return () => {
      if (id)
        void api(`${base}/${id}`, resultSchema, 'DELETE').catch(() => {
          /* Session may have expired. */
        });
    };
  }, [base, session?.id]);
  async function start() {
    setBusy(true);
    setError('');
    setOutput('');
    cursor.current = 0;
    try {
      if (session) await api(`${base}/${session.id}`, resultSchema, 'DELETE');
      append(await api(base, terminalSchema, 'POST'));
      onStarted?.();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to open terminal',
      );
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      await api(`${base}/${session.id}`, resultSchema, 'DELETE');
      setSession(undefined);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to close terminal',
      );
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!session || !input) return;
    setBusy(true);
    setError('');
    try {
      await api(
        `${base}/${session.id}/input`,
        terminalSchema,
        'POST',
        JSON.stringify({ input: `${input}\n` }),
      );
      setOutput((previous) => `${previous}$ ${input}\n`);
      setInput('');
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to send command',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="inspection-pane">
      <div className="inspection-heading">
        <p className="muted">
          Persistent Bash via sbx exec. Opening starts a stopped sandbox.
          Commands retain their working directory. Sessions expire after 15
          minutes without input.
        </p>
        {session?.active ? (
          <button disabled={busy} onClick={() => void close()}>
            Close terminal
          </button>
        ) : (
          <button disabled={busy} onClick={() => void start()}>
            Open terminal
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {session && (
        <>
          <pre
            ref={viewer}
            className="terminal-output"
            tabIndex={0}
            aria-label="Terminal output"
          >
            {output || 'Bash is ready. Enter a command below.'}
          </pre>
          {!session.active && (
            <p role="status">
              Terminal exited
              {session.exitCode === null
                ? '.'
                : ` with code ${session.exitCode}.`}
            </p>
          )}
          <form
            className="terminal-input"
            onSubmit={(event) => void send(event)}
          >
            <label>
              Bash command
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={!session.active}
                placeholder="pwd"
                rows={2}
                maxLength={65535}
              />
            </label>
            <button disabled={busy || !session.active || !input}>
              Run command
            </button>
          </form>
        </>
      )}
    </section>
  );
}

import { Box, Folder, Plus, ArrowUpRight, Square, Trash2 } from 'lucide-react';
import type { Sandbox } from '../shared/contracts';
import { Badge, Empty } from './ui';
export function SandboxList({
  sandboxes,
  onCreate,
  onSelect,
  onAction,
}: {
  sandboxes: Sandbox[];
  onCreate: () => void;
  onSelect: (sandbox: Sandbox) => void;
  onAction: (sandbox: Sandbox, action: 'stop' | 'delete') => void;
}) {
  return (
    <>
      <div className="section-title">
        <div>
          <h2>
            Your sandboxes{' '}
            <span className="count">
              {sandboxes.length.toString().padStart(2, '0')}
            </span>
          </h2>
          <p className="muted">
            Isolated workspaces, ready for your next idea.
          </p>
        </div>
        <button className="primary" onClick={onCreate}>
          <Plus size={16} />
          Create sandbox
        </button>
      </div>
      {sandboxes.length === 0 ? (
        <Empty>No sandboxes yet. Create an environment to get started.</Empty>
      ) : (
        <div className="sandbox-grid">
          {sandboxes.map((sandbox) => (
            <article className="sandbox-card" key={sandbox.name}>
              <div className="card-top">
                <div className="sandbox-icon">
                  <Box size={22} />
                </div>
                <Badge status={sandbox.status} />
              </div>
              <button className="card-name" onClick={() => onSelect(sandbox)}>
                {sandbox.name}
                <ArrowUpRight size={18} />
              </button>
              <p className="agent-label">
                {sandbox.agent === 'shell' ? 'Bash shell' : sandbox.agent}{' '}
                <span>· local</span>
              </p>
              <div className="workspace-line">
                <Folder size={14} />
                <span title={sandbox.workspaces.join('\n')}>
                  {sandbox.workspaces[0] ?? 'No workspace mounted'}
                </span>
              </div>
              <div className="card-footer">
                <button onClick={() => onSelect(sandbox)}>
                  Open workspace <ArrowUpRight size={14} />
                </button>
                <div>
                  {sandbox.status === 'running' && (
                    <button
                      className="icon-button"
                      aria-label={`Stop ${sandbox.name}`}
                      onClick={() => onAction(sandbox, 'stop')}
                    >
                      <Square size={14} />
                    </button>
                  )}
                  <button
                    className="icon-button danger"
                    aria-label={`Delete ${sandbox.name}`}
                    onClick={() => onAction(sandbox, 'delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

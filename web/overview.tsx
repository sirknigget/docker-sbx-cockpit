import type { Sandbox } from '../shared/contracts';
import { RefreshCw } from 'lucide-react';
import type { Section } from './layout';
export function Heading({
  section,
  selected,
  loading,
  onRefresh,
}: {
  section: Section;
  selected?: Sandbox;
  loading: boolean;
  onRefresh: () => void;
}) {
  const titles = {
    sandboxes: 'A little space to build.',
    templates: 'Start from a good place.',
    secrets: 'Keep credentials close.',
  };
  return (
    <div className="page-heading">
      <div className="eyebrow">DOCKER SANDBOXES</div>
      <div className="heading-row">
        <h1>{selected?.name ?? titles[section]}</h1>
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh inventory"
        >
          <RefreshCw size={15} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="intro">
        {selected
          ? 'Inspect and manage this isolated environment.'
          : 'Your agents. Your environments. One place to keep things moving.'}
      </p>
    </div>
  );
}
export function Stats({ sandboxes }: { sandboxes: Sandbox[] }) {
  return (
    <div className="stats">
      <div>
        <span>TOTAL SANDBOXES</span>
        <strong>{sandboxes.length.toString().padStart(2, '0')}</strong>
        <small>on this machine</small>
      </div>
      <div>
        <span>RUNNING</span>
        <strong className="green">
          {sandboxes
            .filter((s) => s.status === 'running')
            .length.toString()
            .padStart(2, '0')}
        </strong>
        <small>
          <i />
          environments active
        </small>
      </div>
      <div>
        <span>WORKSPACE MOUNTS</span>
        <strong>
          {sandboxes
            .reduce((sum, s) => sum + s.workspaces.length, 0)
            .toString()
            .padStart(2, '0')}
        </strong>
        <small>connected to host</small>
      </div>
    </div>
  );
}

import { ArrowLeft } from 'lucide-react';
import type { Sandbox } from '../shared/contracts';
import { Badge } from './ui';
export function SandboxDetail({
  sandbox,
  onBack,
}: {
  sandbox: Sandbox;
  onBack: () => void;
}) {
  return (
    <section>
      <button onClick={onBack}>
        <ArrowLeft size={15} />
        All sandboxes
      </button>
      <div className="detail-heading">
        <h2>{sandbox.name}</h2>
        <Badge status={sandbox.status} />
      </div>
      <p className="muted">
        {sandbox.workspaces.join(', ') || 'No workspace mounted'}
      </p>
    </section>
  );
}

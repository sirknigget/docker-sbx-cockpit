import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Sandbox } from '../shared/contracts';
import { Badge } from './ui';
import { Ports } from './ports';
import { SandboxFiles } from './inspection-files';
import { SandboxDisk } from './inspection-disk';
import { SandboxTerminal } from './inspection-terminal';

type Tab = 'Ports' | 'Files' | 'Disk usage' | 'Terminal';

interface DetailProps {
  sandbox: Sandbox;
  onBack: () => void;
  onChanged: () => void;
}

export function SandboxDetail({ sandbox, onBack, onChanged }: DetailProps) {
  const [tab, setTab] = useState<Tab>('Ports');

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
      <div className="detail-tabs" role="tablist" aria-label="Sandbox tools">
        {(['Ports', 'Files', 'Disk usage', 'Terminal'] as const).map((item) => (
          <button
            role="tab"
            aria-selected={tab === item}
            key={item}
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        <Tool tab={tab} sandbox={sandbox.name} onChanged={onChanged} />
      </div>
    </section>
  );
}

function Tool({
  tab,
  sandbox,
  onChanged,
}: {
  tab: Tab;
  sandbox: string;
  onChanged: () => void;
}) {
  if (tab === 'Files')
    return <SandboxFiles sandbox={sandbox} onStarted={onChanged} />;

  if (tab === 'Disk usage')
    return <SandboxDisk sandbox={sandbox} onStarted={onChanged} />;

  if (tab === 'Terminal')
    return <SandboxTerminal sandbox={sandbox} onStarted={onChanged} />;

  return <Ports sandbox={sandbox} onChanged={onChanged} />;
}

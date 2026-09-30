import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Sandbox } from '../shared/contracts';
import { SandboxList } from './sandboxes';
import { CreateSandboxDialog } from './create-sandbox';
import { Layout, type Section } from './layout';
import { Heading, Stats } from './overview';
import { useInventory } from './use-inventory';
import { LifecycleAction, type PendingAction } from './lifecycle-action';
import { SandboxDetail } from './detail';
import { Templates } from './templates';
import { Secrets } from './secrets';

export function App() {
  const inventory = useInventory();
  const [section, setSection] = useState<Section>('sandboxes');
  const [selectedName, setSelectedName] = useState<string>();
  const selected = inventory.sandboxes.find(
    (sandbox) => sandbox.name === selectedName,
  );
  const [creation, setCreation] = useState<{ template?: string }>();
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PendingAction>();

  function navigate(next: Section) {
    setSection(next);
    setSelectedName(undefined);
    setNotice('');
  }

  function completed(message: string) {
    setNotice(message);
    void inventory.refresh();
  }

  return (
    <Layout
      section={section}
      count={inventory.sandboxes.length}
      onNavigate={navigate}
    >
      <Heading
        section={section}
        selected={selected}
        loading={inventory.loading}
        onRefresh={() => {
          void inventory.refresh();
          setRevision((value) => value + 1);
        }}
      />
      {inventory.error && (
        <div className="error-banner" role="alert">
          {inventory.error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      <Content
        section={section}
        sandboxes={inventory.sandboxes}
        selected={selected}
        onBack={() => setSelectedName(undefined)}
        onSelect={(sandbox) => setSelectedName(sandbox.name)}
        onCreate={(template) => setCreation({ template })}
        revision={revision}
        onChanged={inventory.refresh}
        onAction={(sandbox, action) => setPending({ sandbox, action })}
      />
      {creation && (
        <CreateSandboxDialog
          onClose={() => setCreation(undefined)}
          template={creation.template}
          onCreated={() => completed('Sandbox created')}
        />
      )}
      {pending && (
        <LifecycleAction
          pending={pending}
          onClose={() => setPending(undefined)}
          onCompleted={completed}
        />
      )}
    </Layout>
  );
}

interface ContentProps {
  section: Section;
  sandboxes: Sandbox[];
  selected?: Sandbox;
  onBack: () => void;
  onSelect: (sandbox: Sandbox) => void;
  onCreate: (template?: string) => void;
  revision: number;
  onChanged: () => void;
  onAction: (sandbox: Sandbox, action: 'stop' | 'delete') => void;
}

function Content(props: ContentProps) {
  if (props.selected)
    return (
      <SandboxDetail
        sandbox={props.selected}
        onBack={props.onBack}
        onChanged={props.onChanged}
      />
    );

  if (props.section === 'sandboxes')
    return (
      <>
        <Stats sandboxes={props.sandboxes} />
        <SandboxList
          sandboxes={props.sandboxes}
          onCreate={() => props.onCreate()}
          onSelect={props.onSelect}
          onAction={props.onAction}
        />
      </>
    );

  if (props.section === 'templates')
    return (
      <Templates
        key={props.revision}
        sandboxes={props.sandboxes}
        onCreate={props.onCreate}
      />
    );

  return <Secrets key={props.revision} sandboxes={props.sandboxes} />;
}

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
export function App() {
  const inventory = useInventory();
  const [section, setSection] = useState<Section>('sandboxes');
  const [selected, setSelected] = useState<Sandbox>();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PendingAction>();
  function navigate(next: Section) {
    setSection(next);
    setSelected(undefined);
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
        onRefresh={() => void inventory.refresh()}
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
        onBack={() => setSelected(undefined)}
        onSelect={setSelected}
        onCreate={() => setCreating(true)}
        onAction={(sandbox, action) => setPending({ sandbox, action })}
      />
      {creating && (
        <CreateSandboxDialog
          onClose={() => setCreating(false)}
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
  onCreate: () => void;
  onAction: (sandbox: Sandbox, action: 'stop' | 'delete') => void;
}
function Content(props: ContentProps) {
  if (props.selected)
    return <SandboxDetail sandbox={props.selected} onBack={props.onBack} />;
  if (props.section === 'sandboxes')
    return (
      <>
        <Stats sandboxes={props.sandboxes} />
        <SandboxList
          sandboxes={props.sandboxes}
          onCreate={props.onCreate}
          onSelect={props.onSelect}
          onAction={props.onAction}
        />
      </>
    );
  return (
    <p className="muted">
      {props.section === 'templates'
        ? 'Reusable sandbox snapshots'
        : 'Credentials stored by sbx'}
    </p>
  );
}

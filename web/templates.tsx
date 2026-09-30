import { useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import {
  templatesSchema,
  templateReference,
  type Template,
} from '../shared/configuration';
import type { Sandbox } from '../shared/contracts';
import { bytes, Empty, Modal } from './ui';
import {
  ConfirmDelete,
  InventoryState,
  useInventory,
} from './configuration-ui';

interface TemplatesProps {
  sandboxes: Sandbox[];
  onCreate: (reference: string) => void;
}

export function Templates(props: TemplatesProps) {
  const inventory = useInventory('/templates', templatesSchema);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Template>();

  async function remove() {
    if (!removing) return;

    if (
      await inventory.mutate(
        'DELETE',
        JSON.stringify({ reference: templateReference(removing) }),
      )
    )
      setRemoving(undefined);
  }

  return (
    <section className="configuration-section">
      <div className="section-heading">
        <div>
          <h2>
            Saved templates <span>{inventory.data?.images.length ?? 0}</span>
          </h2>
          <p className="muted">
            Reusable filesystem snapshots for your next environment.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => setSaving(true)}
          disabled={!props.sandboxes.length}
        >
          <Plus size={15} />
          Save template
        </button>
      </div>
      <InventoryState
        error={inventory.error}
        busy={inventory.busy}
        label="templates"
        onRefresh={() => void inventory.refresh()}
      />
      {inventory.data?.images.length === 0 && (
        <Empty>
          No saved templates. Save a sandbox to reuse its installed tools.
        </Empty>
      )}
      <div className="template-grid">
        {inventory.data?.images.map((image) => (
          <TemplateCard
            key={image.id}
            image={image}
            onCreate={props.onCreate}
            onRemove={setRemoving}
          />
        ))}
      </div>
      {saving && (
        <SaveTemplate
          sandboxes={props.sandboxes}
          busy={inventory.busy}
          error={inventory.error}
          onClose={() => setSaving(false)}
          onSubmit={async (body) => {
            if (await inventory.mutate('POST', body)) setSaving(false);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title={`Delete ${removing.repository}:${removing.tag}?`}
          description="This removes the saved template from the local image store. Sandboxes already created from it keep their files."
          busy={inventory.busy}
          onClose={() => setRemoving(undefined)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  );
}

interface CardProps {
  image: Template;
  onCreate: (reference: string) => void;
  onRemove: (image: Template) => void;
}

function TemplateCard(props: CardProps) {
  const reference = templateReference(props.image);

  return (
    <article className="template-card">
      <Layers size={22} />
      <h3>{props.image.tag}</h3>
      <p className="template-reference">{props.image.repository}</p>
      <div className="template-meta">
        <span>{props.image.flavor || 'Custom template'}</span>
        <span>{bytes(props.image.size)}</span>
      </div>
      <div className="template-actions">
        <button onClick={() => props.onCreate(reference)}>
          Create sandbox
        </button>
        <button
          className="icon-button danger"
          aria-label={`Delete template ${reference}`}
          onClick={() => props.onRemove(props.image)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

interface SaveProps {
  sandboxes: Sandbox[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}

function SaveTemplate(props: SaveProps) {
  const stopped = props.sandboxes.filter(
    (sandbox) => sandbox.status === 'stopped',
  );

  return (
    <Modal title="Save template" onClose={props.onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          const form = new FormData(event.currentTarget);

          void props.onSubmit(
            JSON.stringify({
              sandbox: form.get('sandbox'),
              reference: form.get('reference'),
            }),
          );
        }}
      >
        <label>
          Source sandbox
          <select name="sandbox" required>
            {stopped.map((sandbox) => (
              <option key={sandbox.name}>{sandbox.name}</option>
            ))}
          </select>
        </label>
        <label>
          Template reference
          <input
            name="reference"
            placeholder="my-tools:v1"
            required
            pattern="[a-zA-Z0-9][a-zA-Z0-9._:/@-]*"
          />
        </label>
        <p className="muted">
          Stop the source sandbox before saving. Captures internal filesystem
          changes. Mounted workspaces and port mappings are excluded.
        </p>
        {props.error && (
          <p role="alert" className="error">
            {props.error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" onClick={props.onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={props.busy || stopped.length === 0}
          >
            {props.busy ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

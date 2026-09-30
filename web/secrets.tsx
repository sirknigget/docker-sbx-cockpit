import { useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import {
  secretsSchema,
  services,
  type RemoveSecret,
} from '../shared/configuration';
import type { Sandbox } from '../shared/contracts';
import { Empty, Modal } from './ui';
import {
  ConfirmDelete,
  InventoryState,
  ScopeField,
  useInventory,
} from './configuration-ui';
interface SecretsProps {
  sandboxes: Sandbox[];
}
export function Secrets(props: SecretsProps) {
  const inventory = useInventory('/secrets', secretsSchema);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState('all');
  const [removing, setRemoving] = useState<RemoveSecret>();
  const secrets =
    inventory.data?.secrets.filter(
      (secret) => scope === 'all' || secret.scope === scope,
    ) ?? [];
  const custom =
    inventory.data?.custom_secrets.filter(
      (secret) => scope === 'all' || secret.scope === scope,
    ) ?? [];
  async function remove() {
    if (
      removing &&
      (await inventory.mutate('DELETE', JSON.stringify(removing)))
    )
      setRemoving(undefined);
  }
  return (
    <section className="configuration-section">
      <div className="section-heading">
        <div>
          <h2>Stored secrets</h2>
          <p className="muted">
            Credentials stay on the host and are supplied by the sandbox proxy.
          </p>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          <Plus size={15} />
          Add secret
        </button>
      </div>
      <InventoryState
        error={inventory.error}
        busy={inventory.busy}
        label="secrets"
        onRefresh={() => void inventory.refresh()}
      />
      <div className="configuration-toolbar">
        <KeyRound size={16} />
        <select
          className="secret-scope"
          aria-label="Filter secrets by scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="all">Every scope</option>
          <option value="global">Global</option>
          <option value="host">Host only</option>
          {props.sandboxes.map((sandbox) => (
            <option key={sandbox.name}>{sandbox.name}</option>
          ))}
        </select>
        <span className="muted">Values are never displayed</span>
      </div>
      {secrets.length + custom.length === 0 && !inventory.busy && (
        <Empty>No secrets in this scope.</Empty>
      )}
      <div className="configuration-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {secrets.map((secret) => (
              <tr key={`${secret.scope}:${secret.type}:${secret.name}`}>
                <td>{secret.name}</td>
                <td className="secret-kind">{secret.type}</td>
                <td>{secret.scope}</td>
                <td>••••••••</td>
                <td>
                  <button
                    aria-label={`Delete secret ${secret.name}`}
                    onClick={() =>
                      setRemoving({
                        kind:
                          secret.type === 'registry' ? 'registry' : 'service',
                        name: secret.name,
                        scope: secret.scope,
                      })
                    }
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {custom.map((secret) => (
              <tr key={`${secret.scope}:${secret.placeholder}`}>
                <td className="secret-row-name">
                  {secret.env || 'Custom secret'}
                  <small>{secret.targets.join(', ')}</small>
                </td>
                <td className="secret-kind">custom</td>
                <td>{secret.scope}</td>
                <td>••••••••</td>
                <td>
                  <button
                    aria-label={`Delete custom secret ${secret.env || secret.targets[0]}`}
                    onClick={() =>
                      setRemoving({
                        kind: 'custom',
                        placeholder: secret.placeholder,
                        scope: secret.scope,
                      })
                    }
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && (
        <SecretForm
          sandboxes={props.sandboxes}
          busy={inventory.busy}
          error={inventory.error}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            if (await inventory.mutate('POST', body)) setCreating(false);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title="Remove stored secret?"
          description={
            removing.kind === 'registry' && removing.scope === 'host'
              ? 'The CLI removes host-only and global registry credentials for this registry. Requests that used them may stop authenticating.'
              : 'This removes the credential in the selected scope. Requests that used it may stop authenticating.'
          }
          busy={inventory.busy}
          onClose={() => setRemoving(undefined)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  );
}
interface SecretFormProps {
  sandboxes: Sandbox[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}
function SecretForm(props: SecretFormProps) {
  const [kind, setKind] = useState('service');
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const input =
      kind === 'custom'
        ? {
            kind,
            scope: data.get('scope'),
            hosts: String(data.get('hosts'))
              .split('\n')
              .map((host) => host.trim())
              .filter(Boolean),
            env: data.get('env'),
            reference: data.get('reference'),
          }
        : {
            kind,
            scope: data.get('scope'),
            name: data.get('name'),
            username: data.get('username') || undefined,
            value: data.get('value'),
          };
    form.reset();
    await props.onSubmit(JSON.stringify(input));
  }
  return (
    <Modal title="Add or update secret" onClose={props.onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event.currentTarget);
        }}
      >
        <label>
          Type
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="service">Service API key</option>
            <option value="registry">Registry credential</option>
            <option value="custom">Custom secret (dynamic reference)</option>
          </select>
        </label>
        <ScopeField
          key={kind}
          sandboxes={props.sandboxes}
          registry={kind === 'registry'}
        />
        {kind === 'custom' ? (
          <CustomFields />
        ) : (
          <ValueFields registry={kind === 'registry'} />
        )}
        <p className="muted">
          Saving updates an existing credential with the same name and scope.
        </p>
        {props.error && (
          <p className="error" role="alert">
            {props.error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" onClick={props.onClose}>
            Cancel
          </button>
          <button className="primary" disabled={props.busy}>
            {props.busy ? 'Saving…' : 'Save secret'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function CustomFields() {
  return (
    <>
      <label>
        Target hosts
        <textarea
          name="hosts"
          rows={2}
          required
          placeholder="api.example.com"
        />
        <small>One host or wildcard domain per line.</small>
      </label>
      <label>
        Environment variable
        <input
          name="env"
          required
          pattern="[A-Z_][A-Z0-9_]*"
          placeholder="API_KEY"
        />
      </label>
      <label>
        Secret reference
        <input name="reference" required placeholder="op://Vault/Item/field" />
        <small>
          1Password op:// reference or AWS Secrets Manager ARN. Requires an
          authenticated host CLI.
        </small>
      </label>
      <p className="muted">
        Custom secrets are experimental. The proxy substitutes a placeholder on
        requests to the target hosts.
      </p>
    </>
  );
}
interface ValueProps {
  registry: boolean;
}
function ValueFields(props: ValueProps) {
  return (
    <>
      {props.registry ? (
        <>
          <label>
            Registry hostname
            <input name="name" required placeholder="ghcr.io" />
          </label>
          <label>
            Username (optional)
            <input name="username" autoComplete="off" />
          </label>
        </>
      ) : (
        <label>
          Service
          <select name="name">
            {services.map((service) => (
              <option key={service}>{service}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        {props.registry ? 'Password or token' : 'API key'}
        <input
          name="value"
          type="password"
          required
          autoComplete="new-password"
        />
        <small>
          The value is passed through stdin and cleared when submitted.
        </small>
      </label>
    </>
  );
}

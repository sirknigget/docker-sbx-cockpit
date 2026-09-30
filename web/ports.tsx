import { useState } from 'react';
import { Plus, Unplug } from 'lucide-react';
import { portsSchema } from '../shared/configuration';
import type { Port } from '../shared/contracts';
import { Empty, Modal } from './ui';
import {
  ConfirmDelete,
  InventoryState,
  useInventory,
} from './configuration-ui';
interface PortsProps {
  sandbox: string;
  onChanged?: () => void;
}
export function Ports(props: PortsProps) {
  const inventory = useInventory(
    `/sandboxes/${encodeURIComponent(props.sandbox)}/ports`,
    portsSchema,
  );
  const [publishing, setPublishing] = useState(false);
  const [removing, setRemoving] = useState<Port>();
  async function remove() {
    if (!removing) return;
    const body = {
      hostIp: removing.host_ip,
      hostPort: removing.host_port,
      sandboxPort: removing.sandbox_port,
      protocol: removing.protocol,
    };
    if (await inventory.mutate('DELETE', JSON.stringify(body))) {
      setRemoving(undefined);
      props.onChanged?.();
    }
  }
  return (
    <section className="configuration-section">
      <div className="section-heading">
        <div>
          <h2>Published ports</h2>
          <p className="muted">
            Connect host applications to services inside {props.sandbox}.
          </p>
        </div>
        <button className="primary" onClick={() => setPublishing(true)}>
          <Plus size={15} />
          Publish port
        </button>
      </div>
      <InventoryState
        error={inventory.error}
        busy={inventory.busy}
        label="ports"
        onRefresh={() => void inventory.refresh()}
      />
      {inventory.data?.ports.length === 0 && <Empty>No ports published.</Empty>}
      <div className="configuration-table">
        <table>
          <thead>
            <tr>
              <th>Host binding</th>
              <th>Sandbox port</th>
              <th>Protocol</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.data?.ports.map((port) => (
              <tr key={`${port.host_ip}:${port.host_port}/${port.protocol}`}>
                <td>
                  <code>
                    {port.host_ip}:{port.host_port}
                  </code>
                </td>
                <td>{port.sandbox_port}</td>
                <td>{port.protocol}</td>
                <td>
                  <button
                    aria-label={`Unpublish port ${port.host_port}`}
                    onClick={() => setRemoving(port)}
                  >
                    <Unplug size={14} />
                    Unpublish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {publishing && (
        <PublishPort
          busy={inventory.busy}
          error={inventory.error}
          onClose={() => setPublishing(false)}
          onSubmit={async (body) => {
            if (await inventory.mutate('POST', body)) {
              setPublishing(false);
              props.onChanged?.();
            }
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title={`Unpublish port ${removing.host_port}?`}
          description="The host binding will be removed. The service inside the sandbox keeps running."
          busy={inventory.busy}
          onClose={() => setRemoving(undefined)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  );
}
interface PublishProps {
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
}
function PublishPort(props: PublishProps) {
  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    void props.onSubmit(
      JSON.stringify({
        hostIp: data.get('hostIp') || undefined,
        hostPort: data.get('hostPort')
          ? Number(data.get('hostPort'))
          : undefined,
        sandboxPort: Number(data.get('sandboxPort')),
        protocol: data.get('protocol'),
      }),
    );
  }
  return (
    <Modal title="Publish port" onClose={props.onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
      >
        <label>
          Sandbox port
          <input
            name="sandboxPort"
            type="number"
            min={1}
            max={65535}
            required
            placeholder="3000"
          />
        </label>
        <label>
          Host port (optional)
          <input
            name="hostPort"
            type="number"
            min={1}
            max={65535}
            placeholder="Automatically allocated"
          />
        </label>
        <label>
          Host IP (optional)
          <input name="hostIp" placeholder="Loopback by default" />
        </label>
        <label>
          Protocol
          <select name="protocol" defaultValue="tcp4">
            {['tcp4', 'tcp', 'tcp6', 'udp4', 'udp', 'udp6'].map((protocol) => (
              <option key={protocol}>{protocol}</option>
            ))}
          </select>
        </label>
        <p className="muted">
          Publishing starts a stopped sandbox. Leave the IP empty to bind on
          loopback.
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
          <button className="primary" disabled={props.busy}>
            {props.busy ? 'Publishing…' : 'Publish port'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

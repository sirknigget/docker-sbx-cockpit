import { Box, Layers, KeyRound, Container } from 'lucide-react';
import type { ReactNode } from 'react';

export type Section = 'sandboxes' | 'templates' | 'secrets';

export function Layout({
  section,
  count,
  onNavigate,
  children,
}: {
  section: Section;
  count: number;
  onNavigate: (section: Section) => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar section={section} count={count} onNavigate={onNavigate} />
      <main className="main-content">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{' '}
            <strong>{section}</strong>
          </span>
          <span className="local-pill">
            <i /> LOCAL ENVIRONMENT
          </span>
        </header>
        <div className="page-body">
          {children}
          <footer>
            <span>Built around Docker Sandboxes</span>
            <span>Isolated by design. Local by default.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  section,
  count,
  onNavigate,
}: {
  section: Section;
  count: number;
  onNavigate: (section: Section) => void;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/">
        <Container size={27} />
        <div>
          sbx<span>COCKPIT</span>
        </div>
      </a>
      <div className="nav-label">CONTROL PLANE</div>
      <nav>
        {(
          [
            { key: 'sandboxes', label: 'Sandboxes', Icon: Box },
            { key: 'templates', label: 'Templates', Icon: Layers },
            { key: 'secrets', label: 'Secrets', Icon: KeyRound },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            className={section === key ? 'active' : ''}
            onClick={() => onNavigate(key)}
          >
            <Icon size={18} />
            {label}
            {key === 'sandboxes' && <span>{count}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="connection-dot" />
        <div>
          Local machine<small>127.0.0.1 · sbx CLI</small>
        </div>
      </div>
    </aside>
  );
}

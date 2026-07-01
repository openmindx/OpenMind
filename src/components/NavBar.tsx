import './NavBar.css';

export type AppTab = 'chat' | 'boardroom' | 'dojo' | 'diagnostics' | 'settings';

interface TabDef {
  id: AppTab;
  label: string;
  glyph: string;
  desc: string;
  color: string;
}

const TABS: TabDef[] = [
  { id: 'chat',        label: 'Chat',        glyph: '◉', color: '#4d94ff', desc: 'Single-model conversation' },
  { id: 'boardroom',   label: 'Boardroom',   glyph: '⬡', color: '#4caf50', desc: 'Multi-agent consensus' },
  { id: 'dojo',        label: 'Dojo',        glyph: '⊠', color: '#ab47bc', desc: 'Head-to-head evaluation' },
  { id: 'diagnostics', label: 'Diagnostics', glyph: '◈', color: '#ffa726', desc: 'System & server health' },
  { id: 'settings',    label: 'Settings',    glyph: '⚙', color: '#78909c', desc: 'Endpoints & cloud models' },
];

interface NavBarProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  offlineBadge?: boolean;
  // drag-drop on Dojo tab
  onDojoDragOver?: (e: React.DragEvent) => void;
  onDojoDragLeave?: () => void;
  onDojoDrop?: (e: React.DragEvent) => void;
  dojoDragOver?: boolean;
}

export function NavBar({
  active,
  onChange,
  offlineBadge,
  onDojoDragOver,
  onDojoDragLeave,
  onDojoDrop,
  dojoDragOver,
}: NavBarProps) {
  return (
    <nav className="navbar">
      {TABS.map(tab => {
        const isActive = active === tab.id;
        const isDojoDrop = tab.id === 'dojo' && dojoDragOver;

        return (
          <button
            key={tab.id}
            className={`navbar__tab${isActive ? ' navbar__tab--active' : ''}${isDojoDrop ? ' navbar__tab--dragover' : ''}`}
            style={{
              '--tab-color': isDojoDrop ? '#4caf50' : tab.color,
            } as React.CSSProperties}
            onClick={() => onChange(tab.id)}
            onDragOver={tab.id === 'dojo' ? onDojoDragOver : undefined}
            onDragLeave={tab.id === 'dojo' ? onDojoDragLeave : undefined}
            onDrop={tab.id === 'dojo' ? onDojoDrop : undefined}
            title={tab.desc}
          >
            <span className="navbar__glyph">{tab.glyph}</span>
            <span className="navbar__label">{tab.label}</span>
            <span className="navbar__desc">{tab.desc}</span>

            {/* offline badge on diagnostics */}
            {tab.id === 'diagnostics' && offlineBadge && (
              <span className="navbar__badge">!</span>
            )}

            {/* active underline bar */}
            <span className="navbar__bar" />
          </button>
        );
      })}
    </nav>
  );
}

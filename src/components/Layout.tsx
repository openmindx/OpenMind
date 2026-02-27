/**
 * Custom Layout Component
 * Locally designed for Boardroom
 * License: Open Source (specify your license)
 */

import { ReactNode } from 'react';
import './Layout.css';

interface LayoutProps {
  sidebar?: ReactNode;
  main: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Layout({ sidebar, main, header, footer }: LayoutProps) {
  return (
    <div className="layout">
      {header && <header className="layout-header">{header}</header>}

      <div className="layout-body">
        {sidebar && <aside className="layout-sidebar">{sidebar}</aside>}
        <main className="layout-main">{main}</main>
      </div>

      {footer && <footer className="layout-footer">{footer}</footer>}
    </div>
  );
}

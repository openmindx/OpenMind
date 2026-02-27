/**
 * Custom Panel Component
 * Locally designed for Boardroom
 * License: Open Source
 */

import { ReactNode } from 'react';
import './Panel.css';

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      {title && <div className="panel-header">{title}</div>}
      <div className="panel-content">{children}</div>
    </div>
  );
}

/**
 * QuitButton Component
 * Reusable shutdown button module for Boardroom
 * License: Open Source
 */

import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './QuitButton.css';

interface QuitButtonProps {
  variant?: 'small' | 'large';
  showText?: boolean;
}

export function QuitButton({ variant = 'large', showText = true }: QuitButtonProps) {
  // Clean shutdown function
  async function shutdownApp() {
    try {
      await invoke('shutdown_app');
    } catch (error) {
      console.error('Error shutting down:', error);
    }
  }

  // Keyboard shortcuts for shutdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Q or Cmd+Q to quit
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        shutdownApp();
      }
      // Ctrl+W or Cmd+W to quit
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        shutdownApp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <button
      onClick={shutdownApp}
      className={`quit-button quit-button-${variant}`}
      title="Shutdown app (Ctrl+Q / Cmd+Q)"
    >
      ✕ {showText && 'Quit'}
    </button>
  );
}

export default QuitButton;

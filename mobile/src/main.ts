import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';

async function initializeCapacitor(): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {}

  try {
    await Keyboard.setScroll({ isDisabled: true });
  } catch {}

  App.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      try {
        await Haptics.selectionStart();
      } catch {}
    }
  });
}

function mountApp(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  appRoot.innerHTML = '';

  const container = document.createElement('div');
  container.style.padding = '16px';
  container.innerHTML = `
    <h2 style="margin: 0 0 12px;">Your Workout Tracker</h2>
    <p style="opacity: .8;">Replace this shell with your existing HTML.</p>
  `;

  appRoot.appendChild(container);
}

initializeCapacitor();
mountApp();

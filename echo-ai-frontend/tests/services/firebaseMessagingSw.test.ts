import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('firebase-messaging-sw.js', () => {
  it('builds Firebase background messaging setup from runtime registration params', () => {
    const workerPath = resolve(process.cwd(), 'public/firebase-messaging-sw.js');
    const source = readFileSync(workerPath, 'utf-8');

    expect(source).toContain('firebase-app-compat.js');
    expect(source).toContain('firebase-messaging-compat.js');
    expect(source).toContain('new URL(self.location.href)');
    expect(source).toContain("searchParams.get('apiKey')");
    expect(source).toContain('firebase.initializeApp(firebaseConfig)');
    expect(source).toContain('messaging.onBackgroundMessage');
    expect(source).toContain('self.registration.showNotification');
    expect(source).toContain('/review?item=');
  });
});

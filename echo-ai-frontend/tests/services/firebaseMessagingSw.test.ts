import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('firebase-messaging-sw.js', () => {
  it('keeps Firebase background messaging setup self-contained in the worker file', () => {
    const workerPath = resolve(process.cwd(), 'public/firebase-messaging-sw.js');
    const source = readFileSync(workerPath, 'utf-8');

    expect(source).toContain('firebase-app-compat.js');
    expect(source).toContain('firebase-messaging-compat.js');
    expect(source).toContain('const firebaseConfig = {');
    expect(source).toContain('firebase.initializeApp(firebaseConfig)');
    expect(source).toContain('messaging.onBackgroundMessage');
    expect(source).toContain('self.registration.showNotification');
    expect(source).toContain('/review?item=');
  });
});

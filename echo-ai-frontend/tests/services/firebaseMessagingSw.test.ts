import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('firebase-messaging-sw.js', () => {
  it('loads Firebase background messaging config from the generated env-backed file', () => {
    const workerPath = resolve(process.cwd(), 'public/firebase-messaging-sw.js');
    const source = readFileSync(workerPath, 'utf-8');

    expect(source).toContain('firebase-app-compat.js');
    expect(source).toContain('firebase-messaging-compat.js');
    expect(source).toContain("importScripts('/firebase-messaging-config.js')");
    expect(source).toContain('const firebaseConfig = self.__FIREBASE_CONFIG__ ?? {}');
    expect(source).toContain('firebase.initializeApp(firebaseConfig)');
    expect(source).toContain('messaging.onBackgroundMessage');
    expect(source).toContain('self.registration.showNotification');
    expect(source).toContain('/review?item=');
  });
});

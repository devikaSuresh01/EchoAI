import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outputPath = resolve(projectRoot, 'public/firebase-messaging-config.js');

const modeFlagIndex = process.argv.indexOf('--mode');
const mode =
  modeFlagIndex >= 0 && process.argv[modeFlagIndex + 1]
    ? process.argv[modeFlagIndex + 1]
    : 'development';

const env = loadEnv(mode, projectRoot, '');

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `self.__FIREBASE_CONFIG__ = ${JSON.stringify(firebaseConfig, null, 2)};\n`,
  'utf-8',
);

import { describe, expect, it } from 'vitest';
import {
  decodeConfigFromToken,
  encodeConfigToToken,
  parseFirebaseConfigInput,
} from './cloudSync';

describe('cloudSync config parsing and sharing', () => {
  it('parses valid JSON Firebase config', () => {
    const raw = JSON.stringify({
      apiKey: 'AIzaSyTest123',
      authDomain: 'myfin-app.firebaseapp.com',
      projectId: 'myfin-app',
      appId: '1:123456:web:abcdef',
    });

    expect(parseFirebaseConfigInput(raw)).toEqual({
      apiKey: 'AIzaSyTest123',
      authDomain: 'myfin-app.firebaseapp.com',
      projectId: 'myfin-app',
      appId: '1:123456:web:abcdef',
      storageBucket: undefined,
      messagingSenderId: undefined,
    });
  });

  it('parses raw JS firebaseConfig snippet pasted from Firebase Console', () => {
    const snippet = `
      // Import the functions you need
      const firebaseConfig = {
        apiKey: "AIzaSySnippetKey",
        authDomain: "myfin-demo.firebaseapp.com",
        projectId: "myfin-demo",
        storageBucket: "myfin-demo.appspot.com",
        messagingSenderId: "99887766",
        appId: "1:99887766:web:xyz987",
      };
    `;

    expect(parseFirebaseConfigInput(snippet)).toEqual({
      apiKey: 'AIzaSySnippetKey',
      authDomain: 'myfin-demo.firebaseapp.com',
      projectId: 'myfin-demo',
      storageBucket: 'myfin-demo.appspot.com',
      messagingSenderId: '99887766',
      appId: '1:99887766:web:xyz987',
    });

    expect(parseFirebaseConfigInput('{"apiKey": "only-one"}')).toBeNull();
  });

  it('encodes and decodes shareable setup config tokens cleanly', () => {
    const cfg = {
      apiKey: 'AIzaSyTokenKey',
      authDomain: 'myfin-sync.firebaseapp.com',
      projectId: 'myfin-sync',
      appId: '1:112233:web:token',
    };
    const token = encodeConfigToToken(cfg);
    expect(decodeConfigFromToken(token)).toEqual({
      ...cfg,
      storageBucket: undefined,
      messagingSenderId: undefined,
    });
    expect(decodeConfigFromToken('invalid!!!')).toBeNull();
  });
});

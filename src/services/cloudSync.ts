import type {
  Category,
  CloudUser,
  FinanceDivision,
  FirebaseSyncConfig,
  StoredPeriodReport,
  Transaction,
} from '../types/finance';

const STORAGE_KEY_CONFIG = 'myfin_firebase_config';

export const FIRESTORE_SECURITY_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

export function parseFirebaseConfigInput(rawText: string): FirebaseSyncConfig | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const validate = (obj: Record<string, unknown>): FirebaseSyncConfig | null => {
    const apiKey = typeof obj.apiKey === 'string' ? obj.apiKey.trim() : '';
    const authDomain = typeof obj.authDomain === 'string' ? obj.authDomain.trim() : '';
    const projectId = typeof obj.projectId === 'string' ? obj.projectId.trim() : '';
    const appId = typeof obj.appId === 'string' ? obj.appId.trim() : '';
    if (!apiKey || !authDomain || !projectId || !appId) return null;

    return {
      apiKey,
      authDomain,
      projectId,
      appId,
      storageBucket: typeof obj.storageBucket === 'string' ? obj.storageBucket.trim() : undefined,
      messagingSenderId:
        typeof obj.messagingSenderId === 'string' ? obj.messagingSenderId.trim() : undefined,
    };
  };

  // 1. Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      const checked = validate(parsed);
      if (checked) return checked;
    }
  } catch {
    // Fall through to JS snippet extraction
  }

  // 2. Extract fields safely from Firebase Console JS snippet (no eval)
  const keys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;

  const extracted: Record<string, string> = {};
  for (const key of keys) {
    const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
    const match = trimmed.match(regex);
    if (match?.[1]) {
      extracted[key] = match[1];
    }
  }

  return validate(extracted);
}

export function encodeConfigToToken(config: FirebaseSyncConfig): string {
  const json = JSON.stringify(config);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfigFromToken(token: string): FirebaseSyncConfig | null {
  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return parseFirebaseConfigInput(json);
  } catch {
    return null;
  }
}

export function buildShareableSyncUrl(config: FirebaseSyncConfig): string {
  const token = encodeConfigToToken(config);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  return `${origin}${pathname}#sync=${token}`;
}

export function extractSyncConfigFromUrl(): FirebaseSyncConfig | null {
  if (typeof window === 'undefined') return null;

  let token = '';
  if (window.location.hash.startsWith('#sync=')) {
    token = window.location.hash.slice('#sync='.length);
  } else {
    const params = new URLSearchParams(window.location.search);
    token = params.get('sync') ?? '';
  }

  if (!token) return null;
  const decoded = decodeConfigFromToken(token);
  if (!decoded) return null;

  saveFirebaseConfig(decoded);
  try {
    const cleanUrl = `${window.location.pathname}${window.location.search.replace(/([?&])sync=[^&]+&?/, '$1').replace(/[?&]$/, '')}`;
    window.history.replaceState(null, '', cleanUrl || '/');
  } catch {
    // Ignore history cleanup failure
  }
  return decoded;
}

export function saveFirebaseConfig(config: FirebaseSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // Ignore storage error
  }
}

export function clearFirebaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
  } catch {
    // Ignore
  }
}

export function loadSavedFirebaseConfig(): FirebaseSyncConfig | null {
  const fromUrl = extractSyncConfigFromUrl();
  if (fromUrl) return fromUrl;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = parseFirebaseConfigInput(raw);
      if (parsed) return parsed;
    }
  } catch {
    // Ignore
  }

  const envConfigRaw = import.meta.env?.VITE_FIREBASE_CONFIG as string | undefined;
  if (envConfigRaw) {
    return parseFirebaseConfigInput(envConfigRaw);
  }

  return null;
}

async function getFirebaseClients(config: FirebaseSyncConfig) {
  const [appMod, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);

  const appName = `myfin-${config.projectId}-${config.apiKey.slice(-6)}`;
  const existing = appMod.getApps().find((a) => a.name === appName);
  const app = existing ?? appMod.initializeApp(config, appName);
  const auth = authMod.getAuth(app);

  let db;
  try {
    db = fsMod.initializeFirestore(app, {
      localCache: fsMod.persistentLocalCache({
        tabManager: fsMod.persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = fsMod.getFirestore(app);
  }

  return { app, auth, db, authMod, fsMod };
}

export async function signInWithGoogleCloud(config: FirebaseSyncConfig): Promise<void> {
  const { auth, authMod } = await getFirebaseClients(config);
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await authMod.signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signOutGoogleCloud(config: FirebaseSyncConfig): Promise<void> {
  const { auth, authMod } = await getFirebaseClients(config);
  await authMod.signOut(auth);
}

export async function subscribeAuthUser(
  config: FirebaseSyncConfig,
  onUserChange: (user: CloudUser | null) => void,
  onError: (message: string) => void,
): Promise<() => void> {
  const { auth, authMod } = await getFirebaseClients(config);

  try {
    await authMod.getRedirectResult(auth);
  } catch (err) {
    onError((err as Error)?.message ?? 'Google sign-in redirect failed');
  }

  const unsub = authMod.onAuthStateChanged(
    auth,
    (fbUser) => {
      if (!fbUser) {
        onUserChange(null);
        return;
      }
      onUserChange({
        uid: fbUser.uid,
        email: fbUser.email ?? '',
        displayName: fbUser.displayName ?? fbUser.email ?? 'User',
        photoURL: fbUser.photoURL ?? '',
      });
    },
    (err) => {
      onError(err?.message ?? 'Auth listener failed');
    },
  );

  return unsub;
}

export async function mergeLocalWithCloudOnSignIn(
  config: FirebaseSyncConfig,
  uid: string,
  localData: {
    transactions: Transaction[];
    divisions: FinanceDivision[];
    categories: Category[];
    archives: StoredPeriodReport[];
  },
): Promise<{
  transactions: Transaction[];
  divisions: FinanceDivision[];
  categories: Category[];
  archives: StoredPeriodReport[];
}> {
  const { db, fsMod } = await getFirebaseClients(config);

  const txCol = fsMod.collection(db, 'users', uid, 'transactions');
  const divCol = fsMod.collection(db, 'users', uid, 'divisions');
  const catCol = fsMod.collection(db, 'users', uid, 'categories');
  const arcCol = fsMod.collection(db, 'users', uid, 'archives');

  const [txSnap, divSnap, catSnap, arcSnap] = await Promise.all([
    fsMod.getDocs(txCol),
    fsMod.getDocs(divCol),
    fsMod.getDocs(catCol),
    fsMod.getDocs(arcCol),
  ]);

  const remoteTxs = new Map<string, Transaction>();
  txSnap.forEach((d) => remoteTxs.set(d.id, d.data() as Transaction));

  const remoteDivs = new Map<string, FinanceDivision>();
  divSnap.forEach((d) => remoteDivs.set(d.id, d.data() as FinanceDivision));

  const remoteCats = new Map<string, Category>();
  catSnap.forEach((d) => remoteCats.set(d.id, d.data() as Category));

  const remoteArcs = new Map<string, StoredPeriodReport>();
  arcSnap.forEach((d) => remoteArcs.set(d.id, d.data() as StoredPeriodReport));

  const pendingWrites: Array<{ ref: ReturnType<typeof fsMod.doc>; data: unknown }> = [];

  for (const tx of localData.transactions) {
    const remote = remoteTxs.get(tx.id);
    if (!remote || (tx.updatedAt && (!remote.updatedAt || tx.updatedAt > remote.updatedAt))) {
      remoteTxs.set(tx.id, tx);
      pendingWrites.push({ ref: fsMod.doc(txCol, tx.id), data: tx });
    }
  }

  for (const div of localData.divisions) {
    if (!remoteDivs.has(div.id)) {
      remoteDivs.set(div.id, div);
      pendingWrites.push({ ref: fsMod.doc(divCol, div.id), data: div });
    }
  }

  for (const cat of localData.categories) {
    if (!remoteCats.has(cat.id)) {
      remoteCats.set(cat.id, cat);
      pendingWrites.push({ ref: fsMod.doc(catCol, cat.id), data: cat });
    }
  }

  for (const arc of localData.archives) {
    const remote = remoteArcs.get(arc.id);
    if (!remote || (arc.updatedAt && (!remote.updatedAt || arc.updatedAt > remote.updatedAt))) {
      remoteArcs.set(arc.id, arc);
      pendingWrites.push({ ref: fsMod.doc(arcCol, arc.id), data: arc });
    }
  }

  // Commit in chunks of 400 to respect Firestore 500-write batch limit
  for (let i = 0; i < pendingWrites.length; i += 400) {
    const batch = fsMod.writeBatch(db);
    for (const item of pendingWrites.slice(i, i + 400)) {
      batch.set(item.ref, item.data);
    }
    await batch.commit();
  }

  return {
    transactions: Array.from(remoteTxs.values()),
    divisions: Array.from(remoteDivs.values()),
    categories: Array.from(remoteCats.values()),
    archives: Array.from(remoteArcs.values()),
  };
}

export async function subscribeCloudFinanceData(
  config: FirebaseSyncConfig,
  uid: string,
  callbacks: {
    onTransactions: (items: Transaction[]) => void;
    onDivisions: (items: FinanceDivision[]) => void;
    onCategories: (items: Category[]) => void;
    onArchives: (items: StoredPeriodReport[]) => void;
    onError: (msg: string) => void;
  },
): Promise<() => void> {
  const { db, fsMod } = await getFirebaseClients(config);

  const txCol = fsMod.collection(db, 'users', uid, 'transactions');
  const divCol = fsMod.collection(db, 'users', uid, 'divisions');
  const catCol = fsMod.collection(db, 'users', uid, 'categories');
  const arcCol = fsMod.collection(db, 'users', uid, 'archives');

  const unsubTx = fsMod.onSnapshot(
    txCol,
    (snap) => {
      const list: Transaction[] = [];
      snap.forEach((docSnap) => list.push(docSnap.data() as Transaction));
      callbacks.onTransactions(list);
    },
    (err) => callbacks.onError(err.message),
  );

  const unsubDiv = fsMod.onSnapshot(
    divCol,
    (snap) => {
      if (snap.empty) return;
      const list: FinanceDivision[] = [];
      snap.forEach((docSnap) => list.push(docSnap.data() as FinanceDivision));
      callbacks.onDivisions(list);
    },
    (err) => callbacks.onError(err.message),
  );

  const unsubCat = fsMod.onSnapshot(
    catCol,
    (snap) => {
      if (snap.empty) return;
      const list: Category[] = [];
      snap.forEach((docSnap) => list.push(docSnap.data() as Category));
      callbacks.onCategories(list);
    },
    (err) => callbacks.onError(err.message),
  );

  const unsubArc = fsMod.onSnapshot(
    arcCol,
    (snap) => {
      const list: StoredPeriodReport[] = [];
      snap.forEach((docSnap) => list.push(docSnap.data() as StoredPeriodReport));
      callbacks.onArchives(list);
    },
    (err) => callbacks.onError(err.message),
  );

  return () => {
    unsubTx();
    unsubDiv();
    unsubCat();
    unsubArc();
  };
}

export async function syncEntityUpsert(
  config: FirebaseSyncConfig,
  uid: string,
  collectionName: 'transactions' | 'divisions' | 'categories' | 'archives',
  id: string,
  payload: Transaction | FinanceDivision | Category | StoredPeriodReport,
): Promise<void> {
  const { db, fsMod } = await getFirebaseClients(config);
  await fsMod.setDoc(fsMod.doc(db, 'users', uid, collectionName, id), payload);
}

export async function syncEntityDelete(
  config: FirebaseSyncConfig,
  uid: string,
  collectionName: 'transactions' | 'divisions' | 'categories' | 'archives',
  id: string,
): Promise<void> {
  const { db, fsMod } = await getFirebaseClients(config);
  await fsMod.deleteDoc(fsMod.doc(db, 'users', uid, collectionName, id));
}

// 앱 상태 컨텍스트: 시작할 때 한 번 읽고, 바뀔 때마다 저장한다. 저장에 실패하면 화면 상태를 되돌리고 false를 돌려준다.
// 사진은 별도 키. 사진 삭제는 상태 저장이 성공한 뒤에만 한다(메타데이터와 사진 정합성).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Change } from '../domain/records';
import { emptyState, type AppState } from '../domain/types';
import { store as kv } from '../storage/kv';
import { loadPhoto, loadState, removePhotos, savePhoto, saveState, wipeAll } from '../storage/repository';

type Updater = (s: AppState) => AppState | Change;

interface Ctx {
  ready: boolean;
  corrupted: boolean;
  state: AppState;
  /** 상태 변경 + 저장. 실패(저장 오류·한도 초과 throw)면 false, 화면 상태는 이전으로 */
  commit: (fn: Updater) => Promise<boolean>;
  photo: (id: string) => Promise<string | null>;
  putPhoto: (id: string, dataUri: string) => Promise<boolean>;
  dropPhoto: (id: string) => Promise<void>;
  wipe: () => Promise<boolean>;
  dismissCorrupted: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

const isChange = (v: AppState | Change): v is Change => 'dropPhotos' in v;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [corrupted, setCorrupted] = useState(false);
  const ref = useRef(state);
  ref.current = state;
  const photoCache = useRef(new Map<string, string | null>());

  useEffect(() => {
    loadState(kv).then((r) => {
      setState(r.state);
      ref.current = r.state;
      setCorrupted(r.corrupted);
      setReady(true);
    });
  }, []);

  const commit = useCallback(async (fn: Updater) => {
    const prev = ref.current;
    let change: Change;
    try {
      const out = fn(prev);
      change = isChange(out) ? out : { state: out, dropPhotos: [] };
    } catch {
      return false;
    }
    ref.current = change.state;
    setState(change.state);
    try {
      await saveState(kv, change.state);
    } catch {
      ref.current = prev;
      setState(prev);
      return false;
    }
    if (change.dropPhotos.length) {
      for (const id of change.dropPhotos) photoCache.current.delete(id);
      await removePhotos(kv, change.dropPhotos);
    }
    return true;
  }, []);

  const photo = useCallback(async (id: string) => {
    if (photoCache.current.has(id)) return photoCache.current.get(id) ?? null;
    const v = await loadPhoto(kv, id);
    photoCache.current.set(id, v);
    return v;
  }, []);

  const putPhoto = useCallback(async (id: string, dataUri: string) => {
    try {
      await savePhoto(kv, id, dataUri);
      photoCache.current.set(id, dataUri);
      return true;
    } catch {
      return false;
    }
  }, []);

  const dropPhoto = useCallback(async (id: string) => {
    photoCache.current.delete(id);
    await removePhotos(kv, [id]);
  }, []);

  const wipe = useCallback(async () => {
    try {
      await wipeAll(kv, ref.current);
    } catch {
      return false;
    }
    photoCache.current.clear();
    const next: AppState = { ...emptyState(), onboarded: true };
    ref.current = next;
    setState(next);
    try {
      await saveState(kv, next);
    } catch {
      /* 다음 변경 때 다시 저장 */
    }
    return true;
  }, []);

  const dismissCorrupted = useCallback(() => setCorrupted(false), []);

  return <AppCtx.Provider value={{ ready, corrupted, state, commit, photo, putPhoto, dropPhoto, wipe, dismissCorrupted }}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppProvider 밖에서 useApp 호출');
  return c;
}

/** 사진 1장(없으면 null). 화면에서 바로 쓰는 훅 */
export function usePhoto(id: string | undefined): string | null {
  const { photo } = useApp();
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUri(null);
      return;
    }
    photo(id).then((v) => alive && setUri(v));
    return () => {
      alive = false;
    };
  }, [id, photo]);
  return uri;
}

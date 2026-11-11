import type { FloorShot } from './floorShot';

/**
 * Where the apartment's floor picture stands. Only a floor known to have a
 * picture (`expected`) is waited for or reported as failed; any other floor
 * shows its picture if one turns up and stays quiet otherwise.
 */
export type FloorShotState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'ready'; shot: FloorShot };

interface FloorShotInputs {
  shot: FloorShot | null;
  loading: boolean;
  failed: boolean;
  expected: boolean;
  retry: () => void;
}

export function floorShotState({ shot, loading, failed, expected, retry }: FloorShotInputs): FloorShotState {
  if (shot) return { status: 'ready', shot };
  if (expected && loading) return { status: 'loading' };
  if (expected && failed) return { status: 'failed', retry };
  return { status: 'none' };
}

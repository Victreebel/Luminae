const BASE_KEY = 'luminae_skip_cinematics';

function storageKey(accountId?: string | null): string {
  return accountId ? `${BASE_KEY}_${accountId}` : BASE_KEY;
}

export function getSkipCinematics(accountId?: string | null): boolean {
  try {
    return localStorage.getItem(storageKey(accountId)) === '1';
  } catch {
    return false;
  }
}

export function setSkipCinematics(value: boolean, accountId?: string | null): void {
  try {
    localStorage.setItem(storageKey(accountId), value ? '1' : '0');
  } catch {
  }
}

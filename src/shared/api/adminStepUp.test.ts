import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { MAX_STEP_UP_TRIES, codeForRetry, setStepUpHandler } from './adminStepUp';
import { apiRequest } from './httpClient';
import { tokenService } from './tokenService';

let remove: () => void = () => undefined;
afterEach(() => {
  remove();
  vi.unstubAllGlobals();
});

describe('codeForRetry', () => {
  it('asks the registered prompt for a step-up refusal', async () => {
    const handler = vi.fn().mockResolvedValue('123456');
    remove = setStepUpHandler(handler);
    expect(await codeForRetry(403, { error: 'STEP_UP_REQUIRED', message: 'need code' }, 0)).toBe('123456');
    expect(handler).toHaveBeenCalledWith({ reason: 'STEP_UP_REQUIRED', message: 'need code' });
  });

  it('gives up for other refusals, after too many tries, or without a prompt', async () => {
    const handler = vi.fn().mockResolvedValue('123456');
    remove = setStepUpHandler(handler);
    expect(await codeForRetry(403, { error: 'INSUFFICIENT_PERMISSIONS' }, 0)).toBeNull();
    expect(await codeForRetry(400, { error: 'STEP_UP_REQUIRED' }, 0)).toBeNull();
    expect(await codeForRetry(403, { error: 'STEP_UP_LOCKED' }, 0)).toBeNull();
    expect(await codeForRetry(403, { error: 'STEP_UP_INVALID' }, MAX_STEP_UP_TRIES)).toBeNull();
    remove();
    expect(await codeForRetry(403, { error: 'STEP_UP_REQUIRED' }, 0)).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('apiRequest with a step-up refusal', () => {
  beforeEach(() => {
    vi.spyOn(tokenService, 'getAccessToken').mockReturnValue('token');
    document.cookie = '__csrf=csrf-token';
  });

  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('asks for the code and repeats the request with it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(403, { error: 'STEP_UP_REQUIRED', message: 'need code' }))
      .mockResolvedValueOnce(reply(200, { deleted: true }));
    vi.stubGlobal('fetch', fetchMock);
    remove = setStepUpHandler(async () => '654321');

    await expect(apiRequest('/admin/things/1', { method: 'DELETE', requiresAuth: true })).resolves.toEqual({ deleted: true });

    const retried = fetchMock.mock.calls[1][1] as RequestInit;
    expect((retried.headers as Record<string, string>)['X-Admin-Code']).toBe('654321');
    expect(retried.method).toBe('DELETE');
  });

  it('fails with the server message when the admin cancels', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(403, { error: 'STEP_UP_REQUIRED', message: 'Enter the code' })));
    remove = setStepUpHandler(async () => null);
    await expect(apiRequest('/admin/things/1', { method: 'DELETE', requiresAuth: true })).rejects.toThrow('Enter the code');
  });
});

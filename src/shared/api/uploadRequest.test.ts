import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadRequest } from './httpClient';
import { tokenService } from './tokenService';
import { readApiError } from '@/src/features/developments/utils/apiError';

const respond = (status: number, body: unknown, type = 'application/json') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': type } });

afterEach(() => vi.restoreAllMocks());

describe('uploadRequest refusals', () => {
  it('keeps the server code, field and status, like apiRequest', async () => {
    vi.spyOn(tokenService, 'getAccessToken').mockReturnValue('token');
    document.cookie = '__csrf=abc';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond(503, { message: 'Image upload service not configured', code: 'STORAGE_NOT_CONFIGURED' }));
    const err = await uploadRequest('/x', new FormData()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(readApiError(err)).toMatchObject({ status: 503, code: 'STORAGE_NOT_CONFIGURED' });
  });

  it('still gives a status when the answer is not JSON (a proxy refusing a large file)', async () => {
    vi.spyOn(tokenService, 'getAccessToken').mockReturnValue('token');
    document.cookie = '__csrf=abc';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond(413, '<html>Too large</html>', 'text/html'));
    const err = await uploadRequest('/x', new FormData()).catch((e: unknown) => e);
    expect(readApiError(err)).toMatchObject({ status: 413 });
  });
});

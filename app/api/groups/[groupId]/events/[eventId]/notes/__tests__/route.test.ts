/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import * as svc from '@/lib/services/eventNotesService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/eventNotesService');
jest.mock('@/lib/api/auth');

const req = (body?: any) => ({ headers: { get: () => null }, json: async () => body ?? {} }) as any;
const badJson = () => ({ headers: { get: () => null }, json: async () => { throw new SyntaxError('bad'); } }) as any;
const params = Promise.resolve({ groupId: 'g1', eventId: 'e1' });

describe('notes collection route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('401 without a valid token', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue(null);
    expect((await GET(req(), { params })).status).toBe(401);
    expect((await POST(req({ title: 'a' }), { params })).status).toBe(401);
  });

  it('GET returns notes; 403 for a non-member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (svc.listEventNotes as jest.Mock).mockResolvedValueOnce({ success: true, data: [{ id: 'n1' }] });
    const ok = await GET(req(), { params });
    expect(ok.status).toBe(200);
    expect(svc.listEventNotes).toHaveBeenCalledWith('e1', 'g1', 'u1');
    expect((await ok.json()).data).toHaveLength(1);

    (svc.listEventNotes as jest.Mock).mockResolvedValueOnce({ success: false, errorCode: 'FORBIDDEN', message: 'no' });
    expect((await GET(req(), { params })).status).toBe(403);
  });

  it('POST returns 400 for a malformed JSON body', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    const res = await POST(badJson(), { params });
    expect(res.status).toBe(400);
    expect((await res.json()).errorCode).toBe('VALIDATION_ERROR');
  });

  it('POST creates (201), and maps validation errors to 400', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (svc.addEventNote as jest.Mock).mockResolvedValueOnce({ success: true, data: { id: 'n1' } });
    expect((await POST(req({ title: 'a', url: 'https://x.com', body: 'b' }), { params })).status).toBe(201);
    expect(svc.addEventNote).toHaveBeenCalledWith('e1', 'g1', 'u1', { title: 'a', url: 'https://x.com', body: 'b' });

    (svc.addEventNote as jest.Mock).mockResolvedValueOnce({ success: false, errorCode: 'VALIDATION_ERROR', message: 'bad url' });
    const bad = await POST(req({ title: 'a', url: 'javascript:1' }), { params });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('bad url');

    expect((await POST(req({}), { params })).status).toBe(400);
  });
});

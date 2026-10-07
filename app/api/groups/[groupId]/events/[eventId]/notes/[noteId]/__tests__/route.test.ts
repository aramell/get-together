/**
 * @jest-environment node
 */
import { PATCH, DELETE } from '../route';
import * as svc from '@/lib/services/eventNotesService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/eventNotesService');
jest.mock('@/lib/api/auth');

const req = (body?: any) => ({ headers: { get: () => null }, json: async () => body ?? {} }) as any;
const badJson = () => ({ headers: { get: () => null }, json: async () => { throw new SyntaxError('bad'); } }) as any;
const params = Promise.resolve({ groupId: 'g1', eventId: 'e1', noteId: 'n1' });

describe('notes item route', () => {
  beforeEach(() => jest.resetAllMocks());

  it('401 without a valid token', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue(null);
    expect((await PATCH(req({ title: 'a' }), { params })).status).toBe(401);
    expect((await DELETE(req(), { params })).status).toBe(401);
  });

  it('PATCH succeeds, 400 on empty body, 403 for another member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (svc.updateEventNote as jest.Mock).mockResolvedValueOnce({ success: true, data: { id: 'n1' } });
    expect((await PATCH(req({ title: 'x' }), { params })).status).toBe(200);
    expect((await PATCH(req({}), { params })).status).toBe(400);
    (svc.updateEventNote as jest.Mock).mockResolvedValueOnce({ success: false, errorCode: 'FORBIDDEN', message: 'no' });
    expect((await PATCH(req({ title: 'x' }), { params })).status).toBe(403);
  });

  it('PATCH returns 400 for a malformed JSON body', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    const res = await PATCH(badJson(), { params });
    expect(res.status).toBe(400);
    expect((await res.json()).errorCode).toBe('VALIDATION_ERROR');
  });

  it('DELETE succeeds, 403 forbidden, 404 missing', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (svc.deleteEventNote as jest.Mock).mockResolvedValueOnce({ success: true });
    expect((await DELETE(req(), { params })).status).toBe(200);
    (svc.deleteEventNote as jest.Mock).mockResolvedValueOnce({ success: false, errorCode: 'FORBIDDEN', message: 'no' });
    expect((await DELETE(req(), { params })).status).toBe(403);
    (svc.deleteEventNote as jest.Mock).mockResolvedValueOnce({ success: false, errorCode: 'NOT_FOUND', message: 'gone' });
    expect((await DELETE(req(), { params })).status).toBe(404);
  });
});

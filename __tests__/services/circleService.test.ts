import {
  createCircleService,
  getUserCirclesService,
  addContactByPhone,
  addContactByUsername,
  removeContact,
  getCircleDetailService,
  updateCircleNameService,
  deleteCircleService,
} from '@/lib/services/circleService';
import * as circleQueries from '@/lib/db/queries/circles';
import * as userService from '@/lib/services/userService';
import * as smsService from '@/lib/services/smsService';
import * as encryption from '@/lib/encryption/crypto';

jest.mock('@/lib/db/queries/circles', () => ({
  createCircle: jest.fn(),
  getCirclesByUserId: jest.fn(),
  getCircleById: jest.fn(),
  addPhoneContact: jest.fn(),
  addUserContact: jest.fn(),
  findContactByPhoneHash: jest.fn(),
  findContactByUserId: jest.fn(),
  getContactById: jest.fn(),
  deleteContact: jest.fn(),
  getContactsByCircleId: jest.fn(),
  updateCircleName: jest.fn(),
  deleteCircleById: jest.fn(),
}));

jest.mock('@/lib/services/userService', () => ({
  findUserByDisplayNameOrEmail: jest.fn(),
}));

jest.mock('@/lib/services/smsService', () => ({
  hashPhoneNumber: jest.fn(),
}));

jest.mock('@/lib/encryption/crypto', () => ({
  encrypt: jest.fn(),
}));

describe('circleService (Story 10.1)', () => {
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCircleService', () => {
    it('creates a circle with valid data (AC3)', async () => {
      (circleQueries.createCircle as jest.Mock).mockResolvedValue({
        id: 'circle-1',
        user_id: mockUserId,
        name: 'Weekend Crew',
        created_at: '2026-06-30T10:00:00Z',
        updated_at: '2026-06-30T10:00:00Z',
      });

      const result = await createCircleService(mockUserId, { name: 'Weekend Crew' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Circle created');
      expect(result.data).toEqual({
        id: 'circle-1',
        name: 'Weekend Crew',
        contactCount: 0,
        createdAt: '2026-06-30T10:00:00Z',
      });
      expect(circleQueries.createCircle).toHaveBeenCalledWith(mockUserId, 'Weekend Crew');
    });

    it('allows duplicate circle names for the same user (AC5)', async () => {
      (circleQueries.createCircle as jest.Mock).mockResolvedValue({
        id: 'circle-2',
        user_id: mockUserId,
        name: 'Weekend Crew',
        created_at: '2026-06-30T10:05:00Z',
        updated_at: '2026-06-30T10:05:00Z',
      });

      const result = await createCircleService(mockUserId, { name: 'Weekend Crew' });

      expect(result.success).toBe(true);
      expect(circleQueries.createCircle).toHaveBeenCalledWith(mockUserId, 'Weekend Crew');
    });

    it('fails with a missing user id', async () => {
      const result = await createCircleService('', { name: 'Weekend Crew' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(circleQueries.createCircle).not.toHaveBeenCalled();
    });

    it('fails with an empty name (AC4)', async () => {
      const result = await createCircleService(mockUserId, { name: '' } as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Circle name is required');
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(circleQueries.createCircle).not.toHaveBeenCalled();
    });

    it('fails with a name over 100 characters (AC4)', async () => {
      const result = await createCircleService(mockUserId, { name: 'a'.repeat(101) } as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Circle name must be 100 characters or less');
      expect(circleQueries.createCircle).not.toHaveBeenCalled();
    });

    it('returns an internal error when the query throws', async () => {
      (circleQueries.createCircle as jest.Mock).mockRejectedValue(new Error('db down'));

      const result = await createCircleService(mockUserId, { name: 'Weekend Crew' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('getUserCirclesService', () => {
    it('lists circles for a user with an empty circle', async () => {
      (circleQueries.getCirclesByUserId as jest.Mock).mockResolvedValue([
        {
          id: 'circle-1',
          user_id: mockUserId,
          name: 'Weekend Crew',
          created_at: '2026-06-30T10:00:00Z',
          updated_at: '2026-06-30T10:00:00Z',
          contact_count: 0,
        },
      ]);

      const result = await getUserCirclesService(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        {
          id: 'circle-1',
          name: 'Weekend Crew',
          contactCount: 0,
          createdAt: '2026-06-30T10:00:00Z',
        },
      ]);
    });

    it('passes through real contact counts (Story 10.3, AC1)', async () => {
      (circleQueries.getCirclesByUserId as jest.Mock).mockResolvedValue([
        {
          id: 'circle-1',
          user_id: mockUserId,
          name: 'Weekend Crew',
          created_at: '2026-06-30T10:00:00Z',
          updated_at: '2026-06-30T10:00:00Z',
          contact_count: 5,
        },
      ]);

      const result = await getUserCirclesService(mockUserId);

      expect(result.data?.[0].contactCount).toBe(5);
    });

    it('fails with a missing user id', async () => {
      const result = await getUserCirclesService('');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(circleQueries.getCirclesByUserId).not.toHaveBeenCalled();
    });
  });
});

describe('addContactByPhone (Story 10.2)', () => {
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const otherUserId = 'user-999';
  const mockCircle = {
    id: circleId,
    user_id: ownerId,
    name: 'Weekend Crew',
    created_at: '2026-06-30T10:00:00Z',
    updated_at: '2026-06-30T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (smsService.hashPhoneNumber as jest.Mock).mockReturnValue('hashed-phone');
    (encryption.encrypt as jest.Mock).mockReturnValue('encrypted-phone');
  });

  it('adds a phone contact (AC1)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (circleQueries.findContactByPhoneHash as jest.Mock).mockResolvedValue(null);
    (circleQueries.addPhoneContact as jest.Mock).mockResolvedValue({
      id: 'contact-1',
      circle_id: circleId,
      contact_type: 'phone',
      phone_hash: 'hashed-phone',
      phone_display: '+1 555 ***-1234',
      phone_encrypted: 'encrypted-phone',
      user_id: null,
      display_name: '+1 555 ***-1234',
      created_at: '2026-06-30T10:00:00Z',
    });

    const result = await addContactByPhone(circleId, ownerId, '+15550001234');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Contact added');
    expect(result.data).toEqual({ id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' });
    expect(circleQueries.addPhoneContact).toHaveBeenCalledWith(
      circleId,
      'hashed-phone',
      '+1 555 ***-1234',
      'encrypted-phone'
    );
    expect(encryption.encrypt).toHaveBeenCalledWith('+15550001234');
  });

  it('returns NOT_FOUND when circle does not exist', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(null);

    const result = await addContactByPhone(circleId, ownerId, '+15550001234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
    expect(circleQueries.addPhoneContact).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when the circle belongs to another user', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await addContactByPhone(circleId, otherUserId, '+15550001234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(circleQueries.addPhoneContact).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for an invalid phone number (AC3)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await addContactByPhone(circleId, ownerId, '555-000-1234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
    expect(result.message).toBe(
      'Please enter a valid phone number including country code (e.g., +1 555 000 1234)'
    );
    expect(circleQueries.addPhoneContact).not.toHaveBeenCalled();
  });

  it('returns DUPLICATE_CONTACT when the phone is already in the circle (AC5)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (circleQueries.findContactByPhoneHash as jest.Mock).mockResolvedValue({ id: 'existing-contact' });

    const result = await addContactByPhone(circleId, ownerId, '+15550001234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_CONTACT');
    expect(result.message).toBe('This contact is already in this circle');
    expect(circleQueries.addPhoneContact).not.toHaveBeenCalled();
  });

  it('returns an internal error when the query throws', async () => {
    (circleQueries.getCircleById as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await addContactByPhone(circleId, ownerId, '+15550001234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('addContactByUsername (Story 10.2)', () => {
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const mockCircle = {
    id: circleId,
    user_id: ownerId,
    name: 'Weekend Crew',
    created_at: '2026-06-30T10:00:00Z',
    updated_at: '2026-06-30T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a user contact by email (AC2)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (userService.findUserByDisplayNameOrEmail as jest.Mock).mockResolvedValue({
      id: 'friend-1',
      email: 'jane@example.com',
      display_name: 'Jane Doe',
    });
    (circleQueries.findContactByUserId as jest.Mock).mockResolvedValue(null);
    (circleQueries.addUserContact as jest.Mock).mockResolvedValue({
      id: 'contact-2',
      circle_id: circleId,
      contact_type: 'user',
      phone_hash: null,
      phone_display: null,
      user_id: 'friend-1',
      display_name: 'Jane Doe',
      created_at: '2026-06-30T10:00:00Z',
    });

    const result = await addContactByUsername(circleId, ownerId, 'jane@example.com');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'contact-2', type: 'user', displayName: 'Jane Doe' });
    expect(circleQueries.addUserContact).toHaveBeenCalledWith(circleId, 'friend-1', 'Jane Doe');
  });

  it('returns USER_NOT_FOUND when no matching user exists (AC4)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (userService.findUserByDisplayNameOrEmail as jest.Mock).mockResolvedValue(null);

    const result = await addContactByUsername(circleId, ownerId, 'nobody@example.com');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('USER_NOT_FOUND');
    expect(result.message).toBe(
      'No user found with that name or email. You can still add them by phone number.'
    );
    expect(circleQueries.addUserContact).not.toHaveBeenCalled();
  });

  it('returns DUPLICATE_CONTACT when the user is already in the circle (AC5)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (userService.findUserByDisplayNameOrEmail as jest.Mock).mockResolvedValue({
      id: 'friend-1',
      email: 'jane@example.com',
      display_name: 'Jane Doe',
    });
    (circleQueries.findContactByUserId as jest.Mock).mockResolvedValue({ id: 'existing-contact' });

    const result = await addContactByUsername(circleId, ownerId, 'jane@example.com');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_CONTACT');
    expect(circleQueries.addUserContact).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when the circle belongs to another user', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await addContactByUsername(circleId, 'user-999', 'jane@example.com');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(userService.findUserByDisplayNameOrEmail).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR for an empty query', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await addContactByUsername(circleId, ownerId, '   ');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
    expect(userService.findUserByDisplayNameOrEmail).not.toHaveBeenCalled();
  });
});

describe('removeContact (Story 10.2)', () => {
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const contactId = 'contact-1';
  const mockCircle = {
    id: circleId,
    user_id: ownerId,
    name: 'Weekend Crew',
    created_at: '2026-06-30T10:00:00Z',
    updated_at: '2026-06-30T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes a contact (AC6)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (circleQueries.getContactById as jest.Mock).mockResolvedValue({
      id: contactId,
      circle_id: circleId,
    });

    const result = await removeContact(circleId, contactId, ownerId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Contact removed');
    expect(circleQueries.deleteContact).toHaveBeenCalledWith(contactId);
  });

  it('returns NOT_FOUND when the circle does not exist', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(null);

    const result = await removeContact(circleId, contactId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
    expect(circleQueries.deleteContact).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when the circle belongs to another user', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await removeContact(circleId, contactId, 'user-999');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(circleQueries.deleteContact).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when the contact does not belong to the circle', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (circleQueries.getContactById as jest.Mock).mockResolvedValue({
      id: contactId,
      circle_id: 'some-other-circle',
    });

    const result = await removeContact(circleId, contactId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
    expect(circleQueries.deleteContact).not.toHaveBeenCalled();
  });

  it('returns an internal error when the query throws', async () => {
    (circleQueries.getCircleById as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await removeContact(circleId, contactId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('getCircleDetailService (Story 10.3)', () => {
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const mockCircle = {
    id: circleId,
    user_id: ownerId,
    name: 'Weekend Crew',
    created_at: '2026-06-30T10:00:00Z',
    updated_at: '2026-06-30T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the circle with its contacts (AC3)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([
      {
        id: 'contact-1',
        circle_id: circleId,
        contact_type: 'phone',
        phone_hash: 'h',
        phone_display: '+1 555 ***-1234',
        user_id: null,
        display_name: '+1 555 ***-1234',
        created_at: '2026-06-30T10:05:00Z',
      },
    ]);

    const result = await getCircleDetailService(circleId, ownerId);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: circleId,
      name: 'Weekend Crew',
      contacts: [{ id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' }],
      createdAt: '2026-06-30T10:00:00Z',
      updatedAt: '2026-06-30T10:00:00Z',
    });
  });

  it('returns NOT_FOUND when the circle does not exist', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(null);

    const result = await getCircleDetailService(circleId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('returns FORBIDDEN when the circle belongs to another user (AC6)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await getCircleDetailService(circleId, 'user-999');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(circleQueries.getContactsByCircleId).not.toHaveBeenCalled();
  });

  it('returns an internal error when the query throws', async () => {
    (circleQueries.getCircleById as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await getCircleDetailService(circleId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('updateCircleNameService (Story 10.3)', () => {
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const mockCircle = {
    id: circleId,
    user_id: ownerId,
    name: 'Weekend Crew',
    created_at: '2026-06-30T10:00:00Z',
    updated_at: '2026-06-30T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renames the circle (AC4)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (circleQueries.updateCircleName as jest.Mock).mockResolvedValue({
      ...mockCircle,
      name: 'Trivia Night Crew',
      updated_at: '2026-07-01T09:00:00Z',
    });

    const result = await updateCircleNameService(circleId, ownerId, { name: 'Trivia Night Crew' });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Circle name updated');
    expect(result.data).toEqual({
      id: circleId,
      name: 'Trivia Night Crew',
      updatedAt: '2026-07-01T09:00:00Z',
    });
    expect(circleQueries.updateCircleName).toHaveBeenCalledWith(circleId, 'Trivia Night Crew');
  });

  it('returns VALIDATION_ERROR for an empty name', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await updateCircleNameService(circleId, ownerId, { name: '' } as any);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Circle name is required');
    expect(result.errorCode).toBe('VALIDATION_ERROR');
    expect(circleQueries.updateCircleName).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when the circle does not exist', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(null);

    const result = await updateCircleNameService(circleId, ownerId, { name: 'New Name' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('returns FORBIDDEN when the circle belongs to another user (AC6)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await updateCircleNameService(circleId, 'user-999', { name: 'New Name' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(circleQueries.updateCircleName).not.toHaveBeenCalled();
  });

  it('returns an internal error when the query throws', async () => {
    (circleQueries.getCircleById as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await updateCircleNameService(circleId, ownerId, { name: 'New Name' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INTERNAL_ERROR');
  });
});

describe('deleteCircleService (Story 10.3)', () => {
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const mockCircle = {
    id: circleId,
    user_id: ownerId,
    name: 'Weekend Crew',
    created_at: '2026-06-30T10:00:00Z',
    updated_at: '2026-06-30T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the circle (AC5)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await deleteCircleService(circleId, ownerId);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Circle deleted');
    expect(circleQueries.deleteCircleById).toHaveBeenCalledWith(circleId);
  });

  it('returns NOT_FOUND when the circle does not exist', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(null);

    const result = await deleteCircleService(circleId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
    expect(circleQueries.deleteCircleById).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when the circle belongs to another user (AC6)', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);

    const result = await deleteCircleService(circleId, 'user-999');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(circleQueries.deleteCircleById).not.toHaveBeenCalled();
  });

  it('returns an internal error when the query throws', async () => {
    (circleQueries.getCircleById as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await deleteCircleService(circleId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INTERNAL_ERROR');
  });
});

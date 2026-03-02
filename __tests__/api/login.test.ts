import { POST } from '@/app/api/auth/login/route';
import { loginUser } from '@/lib/services/authService';

// Mock the auth service
jest.mock('@/lib/services/authService');

const mockLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully login with valid credentials', async () => {
    mockLoginUser.mockResolvedValueOnce({
      success: true,
      message: 'Login successful',
      accessToken: 'test-access-token',
      idToken: 'test-id-token',
      refreshToken: 'test-refresh-token',
      userId: 'user@example.com',
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'ValidPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.accessToken).toBe('test-access-token');
    expect(data.idToken).toBe('test-id-token');
  });

  it('should return 422 for validation error - invalid email', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'ValidPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 422 for validation error - password too short', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 401 for invalid credentials', async () => {
    mockLoginUser.mockResolvedValueOnce({
      success: false,
      message: 'Invalid email or password',
      errorCode: 'UNAUTHORIZED',
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'WrongPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Invalid email or password');
  });

  it('should return 403 for unconfirmed email', async () => {
    mockLoginUser.mockResolvedValueOnce({
      success: false,
      message: 'Please confirm your email before logging in',
      errorCode: 'EMAIL_NOT_CONFIRMED',
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'unconfirmed@example.com',
        password: 'ValidPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toContain('confirm your email');
  });

  it('should return 400 for missing email', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'ValidPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
  });

  it('should return 400 for missing password', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
  });

  it('should have proper error response structure', async () => {
    mockLoginUser.mockResolvedValueOnce({
      success: false,
      message: 'Invalid email or password',
      errorCode: 'UNAUTHORIZED',
    });

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'WrongPassword123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('errorCode');
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { LoginInPlaceModal } from '@/components/auth/LoginInPlaceModal';
import { AuthProvider } from '@/lib/contexts/AuthContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/events/public/token-123',
}));

const renderModal = (onClose = jest.fn()) => {
  render(
    <ChakraProvider>
      <AuthProvider>
        <LoginInPlaceModal isOpen onClose={onClose} />
      </AuthProvider>
    </ChakraProvider>
  );
  return { onClose };
};

const fillAndSubmit = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);

  const submitButton = screen.getByRole('button', { name: /log in/i });
  await waitFor(() => expect(submitButton).not.toBeDisabled());
  await user.click(submitButton);
};

describe('LoginInPlaceModal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('renders the existing LoginForm fields, no separate auth UI', () => {
    renderModal();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/log in to continue/i)).toBeInTheDocument();
  });

  it('on successful login, logs in via AuthContext (no navigation) and closes the modal', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        accessToken: 'access-123',
        idToken: 'id-123',
        userId: 'user-1',
      }),
    }) as unknown as typeof fetch;

    const { onClose } = renderModal();

    await fillAndSubmit('guest@example.com', 'ValidPassword123!');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    // AuthContext.login() persists the tokens synchronously -- confirms the
    // modal upgraded auth state in place rather than a page navigating away
    // to do it.
    expect(localStorage.getItem('accessToken')).toBe('access-123');
  });

  it('on failed login, shows the inline error and keeps the modal open (parent controls isOpen)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, message: 'Incorrect email or password' }),
    }) as unknown as typeof fetch;

    const { onClose } = renderModal();

    await fillAndSubmit('guest@example.com', 'WrongPassword123!');

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

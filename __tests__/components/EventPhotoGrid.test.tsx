import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventPhotoGrid } from '@/components/groups/EventPhotoGrid';
import { AuthProvider } from '@/lib/contexts/AuthContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/groups/group-1/events/event-1',
}));

jest.mock('@/lib/contexts/AuthContext', () => ({
  ...jest.requireActual('@/lib/contexts/AuthContext'),
  useAuth: jest.fn(() => ({
    userId: 'user-1',
    accessToken: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <AuthProvider>{component}</AuthProvider>
    </ChakraProvider>
  );
};

const mockPhotos = [
  { id: 'photo-1', uploaded_by: 'user-1', url: 'https://example.com/photo1.jpg', caption: null },
  { id: 'photo-2', uploaded_by: 'other-user', url: 'https://example.com/photo2.jpg', caption: null },
];

describe('EventPhotoGrid Component', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the photo grid with fetched photos', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPhotos }),
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPhotoGrid eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(2);
    });
  });

  it('shows the delete button only on the current user\'s own photos', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPhotos }),
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPhotoGrid eventId="event-1" groupId="group-1" />);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(2);
    });

    // Only photo-1 (uploaded_by: 'user-1', the current user) gets a delete button
    expect(screen.getAllByLabelText('Delete photo')).toHaveLength(1);
  });

  it('uploads a valid photo and appends it to the grid', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPhotoGrid eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('No photos yet.')).toBeInTheDocument());

    const newPhoto = { id: 'photo-3', uploaded_by: 'user-1', url: 'https://example.com/photo3.jpg', caption: null };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: newPhoto }),
    });

    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Upload a photo') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(1);
    });
  });

  it('rejects an invalid file type client-side without calling the upload endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPhotoGrid eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getByText('No photos yet.')).toBeInTheDocument());

    const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.length;

    const file = new File(['fake-data'], 'doc.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText('Upload a photo') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/JPEG, PNG, or WebP/i)).toBeInTheDocument();
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBefore);
  });

  it('deletes a photo optimistically and reverts on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [mockPhotos[0]] }),
    }) as unknown as typeof fetch;

    renderWithProviders(<EventPhotoGrid eventId="event-1" groupId="group-1" />);

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Server error' }),
    });

    fireEvent.click(screen.getByLabelText('Delete photo'));

    // Optimistic removal happens synchronously
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    // Reverts once the failed request resolves
    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(1);
    });
  });
});

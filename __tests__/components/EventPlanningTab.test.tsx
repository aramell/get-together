import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { EventPlanningTab } from '@/components/groups/EventPlanningTab';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('EventPlanningTab Component', () => {
  it('renders a placeholder message', () => {
    renderWithChakra(<EventPlanningTab />);

    expect(screen.getByText(/planning tools coming soon/i)).toBeInTheDocument();
  });

  it('does not perform any data fetching', () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    renderWithChakra(<EventPlanningTab />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

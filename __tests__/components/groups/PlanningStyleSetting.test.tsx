import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { PlanningStyleSetting } from '@/components/groups/PlanningStyleSetting';

jest.mock('@/lib/services/groupService', () => ({
  updateGroupSettings: jest.fn(),
}));

import { updateGroupSettings } from '@/lib/services/groupService';

const ChakraWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

describe('PlanningStyleSetting Component (Story 2.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AC3: Non-admin view', () => {
    it('renders the current value read-only, with no edit control', () => {
      render(
        <PlanningStyleSetting groupId="group-1" planningStyle="availability-first" isAdmin={false} />,
        { wrapper: ChakraWrapper }
      );

      expect(screen.getByTestId('planning-style-readonly')).toHaveTextContent('Availability-first');
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });
  });

  describe('AC2: Admin view', () => {
    it('renders an editable control showing the current value', () => {
      render(
        <PlanningStyleSetting groupId="group-1" planningStyle="proposals-first" isAdmin={true} />,
        { wrapper: ChakraWrapper }
      );

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      expect(radios).toHaveLength(2);
      const checked = radios.find((r) => r.checked);
      expect(checked?.value).toBe('proposals-first');
    });

    it('calls the update API and reflects the new value when toggled', async () => {
      (updateGroupSettings as jest.Mock).mockResolvedValue({ success: true, group: {} });

      render(
        <PlanningStyleSetting groupId="group-1" planningStyle="availability-first" isAdmin={true} />,
        { wrapper: ChakraWrapper }
      );

      const proposalsRadio = screen.getByRole('radio', { name: 'Proposals-first' });
      fireEvent.click(proposalsRadio);

      await waitFor(() => {
        expect(updateGroupSettings).toHaveBeenCalledWith('group-1', {
          planning_style: 'proposals-first',
        });
      });
      await waitFor(() => {
        expect((proposalsRadio as HTMLInputElement).checked).toBe(true);
      });
    });

    it('reverts to the previous value if the update fails', async () => {
      (updateGroupSettings as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Not authorized',
      });

      render(
        <PlanningStyleSetting groupId="group-1" planningStyle="availability-first" isAdmin={true} />,
        { wrapper: ChakraWrapper }
      );

      const proposalsRadio = screen.getByRole('radio', { name: 'Proposals-first' }) as HTMLInputElement;
      fireEvent.click(proposalsRadio);

      await waitFor(() => {
        expect(updateGroupSettings).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(proposalsRadio.checked).toBe(false);
      });
    });
  });
});

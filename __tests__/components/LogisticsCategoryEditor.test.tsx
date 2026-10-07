import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { LogisticsCategoryEditor } from '@/components/groups/LogisticsCategoryEditor';
import { LogisticsCategoryDef } from '@/lib/logistics/defaultCategories';

const categories: LogisticsCategoryDef[] = [
  { key: 'bring', label: 'Bring List', mode: 'single' },
  { key: 'carpool', label: 'Carpool', mode: 'seats' },
];

function setup(usedKeys: string[] = []) {
  const onSave = jest.fn().mockResolvedValue(undefined);
  render(
    <ChakraProvider>
      <LogisticsCategoryEditor
        isOpen
        onClose={jest.fn()}
        categories={categories}
        usedKeys={new Set(usedKeys)}
        onSave={onSave}
      />
    </ChakraProvider>
  );
  return { onSave };
}

describe('LogisticsCategoryEditor', () => {
  it('saves a rename keeping the key, and a new row without one', async () => {
    const { onSave } = setup();

    fireEvent.change(screen.getByLabelText('Category name 1'), { target: { value: 'Snacks' } });
    fireEvent.click(screen.getByRole('button', { name: /add category/i }));
    fireEvent.change(screen.getByLabelText('Category name 3'), { target: { value: 'Rides' } });
    fireEvent.change(screen.getByLabelText('Type for Rides'), { target: { value: 'seats' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith([
      { key: 'bring', label: 'Snacks', mode: 'single' },
      { key: 'carpool', label: 'Carpool', mode: 'seats' },
      { key: undefined, label: 'Rides', mode: 'seats' },
    ]);
  });

  it('reorders rows', async () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Move Carpool up' }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].map((c: any) => c.key)).toEqual(['carpool', 'bring']);
  });

  it('locks type and removal for a category in use', () => {
    setup(['bring']);
    expect(screen.getByLabelText('Type for Bring List')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Bring List' })).toBeDisabled();
    expect(screen.getByLabelText('Type for Carpool')).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Carpool' })).not.toBeDisabled();
  });

  it('blocks saving with an empty label or no categories', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Category name 1'), { target: { value: '  ' } });
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });

  it('keeps at least one category', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bring List' }));
    expect(screen.getByRole('button', { name: 'Remove Carpool' })).toBeDisabled();
  });
});

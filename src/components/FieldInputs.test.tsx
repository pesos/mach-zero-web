import type { Draft, Field } from '@eventkit/sdk';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FieldInputs } from './FieldInputs';

const field = (over: Partial<Field>): Field => ({
  id: 'f',
  scope: 'member',
  label: 'Question',
  help: null,
  type: 'choice',
  options: ['A', 'B'],
  required: true,
  unique: false,
  pattern: null,
  position: 0,
  ...over,
});

function Harness({ fields }: { fields: Field[] }) {
  const [draft, setDraft] = useState<Draft>({});
  return (
    <>
      <FieldInputs fields={fields} value={draft} onChange={setDraft} prefix="t" />
      <output>{JSON.stringify(draft)}</output>
    </>
  );
}

describe('FieldInputs', () => {
  it('shows multiple choice as radio buttons and a dropdown question as a dropdown', async () => {
    render(
      <Harness
        fields={[
          field({ id: 'track', label: 'Track', type: 'choice' }),
          field({ id: 'size', label: 'T-shirt', type: 'dropdown', options: ['S', 'M'] }),
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    const select = screen.getByRole('combobox', { name: 'T-shirt' });
    await userEvent.selectOptions(select, 'M');
    expect(screen.getByRole('status')).toHaveTextContent('{"size":"M"}');
  });
});

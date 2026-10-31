import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders formatting and opens links in a new tab', () => {
    render(<Markdown>{'**UPI**: [pay here](https://pay.example)\n- one\n- two'}</Markdown>);
    expect(screen.getByText('UPI').tagName).toBe('STRONG');
    const link = screen.getByRole('link', { name: 'pay here' });
    expect(link).toHaveAttribute('href', 'https://pay.example');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps single line breaks, so plain text reads as before', () => {
    const { container } = render(<Markdown>{'Bank: Canara\nIFSC: CNRB0001234'}</Markdown>);
    expect(container.querySelector('br')).not.toBeNull();
  });

  it('does not render raw HTML', () => {
    const { container } = render(<Markdown>{'<img src=x onerror="alert(1)"> hi'}</Markdown>);
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows links as text when inert', () => {
    render(<Markdown inert>{'[site](https://x.example)'}</Markdown>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('site')).toBeInTheDocument();
  });
});

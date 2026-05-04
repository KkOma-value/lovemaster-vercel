import { render, screen } from '@testing-library/react';
import { AuthShell } from './AuthShell';

describe('AuthShell', () => {
  it('renders the hero title', () => {
    render(
      <AuthShell heroEyebrow="Test" heroTitle="Hello" heroBody="Body">
        <div>Form content</div>
      </AuthShell>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

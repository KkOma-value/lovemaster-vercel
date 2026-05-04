import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import HomePage from './HomePage';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn()
  })
}));

vi.mock('../../contexts/ChatRuntimeContext', () => ({
  useChatRuntime: () => ({
    activeRuns: []
  })
}));

describe('HomePage', () => {
  it('renders the brand title', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Love Master')).toBeInTheDocument();
  });
});

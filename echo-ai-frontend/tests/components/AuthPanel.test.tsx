import { render, screen } from '@testing-library/react';
import { AuthPanel } from '../../src/components/AuthPanel';
import { useAuthStore } from '../../src/stores/authStore';

vi.mock('../../src/services/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

describe('AuthPanel', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isLoading: false,
    });
  });

  it('renders the centered sign-in controls and account creation action', () => {
    render(<AuthPanel />);

    expect(screen.getByLabelText('Email')).toBeEnabled();
    expect(screen.getByLabelText('Password')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Create Account' })).toBeInTheDocument();
  });
});

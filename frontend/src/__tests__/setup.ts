import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/test', state: null, search: '', hash: '' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useParams: () => ({}),
  };
});

Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SITE_URL: 'http://localhost:5173',
    VITE_API_URL: 'http://localhost:8000',
    MODE: 'test',
  },
  configurable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
});

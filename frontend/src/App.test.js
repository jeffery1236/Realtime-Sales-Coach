import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SalesCoach AI', () => {
  render(<App />);
  const heading = screen.getByText(/SalesCoach/i);
  expect(heading).toBeInTheDocument();
});

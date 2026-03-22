import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DotFlat app', () => {
  render(<App />);
  const linkElement = screen.getByText(/DotFlat/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders navigation menu', () => {
  render(<App />);
  const menuButton = screen.getByText(/Menu/i);
  expect(menuButton).toBeInTheDocument();
});

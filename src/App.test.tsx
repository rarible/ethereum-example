import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders sdk example page', () => {
  render(<App />);
  const linkElement = screen.getByText(/Connected address:/i);
  expect(linkElement).toBeInTheDocument();
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock data
const mockWheels = [
  {
    id: 1,
    part_number: '68811',
    size: '17x7.5',
    offset: '+55',
    model: 'Crosstrek',
    year: 2018,
    finish: 'Silver',
    grade: 'A',
    retail_price: 150.00,
    sku: '68811-17x7.5-2018A',
    status: 'available'
  },
  {
    id: 2,
    part_number: '68812',
    size: '18x8.5',
    offset: '+48',
    model: 'WRX',
    year: 2020,
    finish: 'Black',
    grade: 'A',
    retail_price: 200.00,
    sku: '68812-18x8.5-2020A',
    status: 'sold'
  }
];

const mockSummary = {
  availableCount: 1,
  soldCount: 1,
  availableValue: 150.00,
  soldValue: 200.00
};

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/wheels')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWheels)
        });
      }
      if (url.includes('/api/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummary)
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  test('renders header with title', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/OEM Subaru Wheel Inventory/i)).toBeInTheDocument();
    });
  });

  test('displays summary cards correctly', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Available count
      expect(screen.getByText('$150.00')).toBeInTheDocument(); // Available value
    });
  });

  test('fetches and displays wheels on mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('68811-17x7.5-2018A')).toBeInTheDocument();
      expect(screen.getByText('Crosstrek')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/wheels');
    expect(fetch).toHaveBeenCalledWith('/api/summary');
  });

  test('switches between available and sold tabs', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('68811-17x7.5-2018A')).toBeInTheDocument();
    });

    // Click sold tab
    const soldButton = screen.getByRole('button', { name: /Sold/i });
    fireEvent.click(soldButton);

    await waitFor(() => {
      expect(screen.getByText('68812-18x8.5-2020A')).toBeInTheDocument();
      expect(screen.queryByText('68811-17x7.5-2018A')).not.toBeInTheDocument();
    });
  });

  test('opens modal when Add New Wheel button is clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Add New Wheel/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add New Wheel/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/Add New Wheel/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('68811')).toBeInTheDocument();
  });

  test('submits form to add new wheel', async () => {
    const user = userEvent.setup();
    
    fetch.mockImplementationOnce((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 3,
            part_number: '68999',
            size: '17x8',
            offset: '+50',
            model: 'Outback',
            year: 2022,
            finish: 'Silver',
            grade: 'A',
            retail_price: 180.00,
            sku: '68999-17x8-2022A',
            status: 'available'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockWheels)
      });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Add New Wheel/i)).toBeInTheDocument();
    });

    // Open modal
    const addButton = screen.getByRole('button', { name: /Add New Wheel/i });
    fireEvent.click(addButton);

    // Fill form
    await user.type(screen.getByPlaceholderText('68811'), '68999');
    await user.type(screen.getByPlaceholderText('17x7.5'), '17x8');
    await user.type(screen.getByPlaceholderText('55 (+ will be added automatically)'), '50');
    await user.type(screen.getByPlaceholderText('Crosstrek'), 'Outback');
    await user.type(screen.getByPlaceholderText('2018'), '2022');
    await user.type(screen.getByPlaceholderText('Silver'), 'Silver');
    await user.selectOptions(screen.getByRole('combobox'), 'A');
    await user.type(screen.getByPlaceholderText('150.00'), '180.00');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Add Wheel/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/wheels', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  test('handles delete action with confirmation', async () => {
    window.confirm = jest.fn(() => true);
    
    fetch.mockImplementationOnce((url, options) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Deleted' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockWheels)
      });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('68811-17x7.5-2018A')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/wheels/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  test('handles status toggle', async () => {
    fetch.mockImplementationOnce((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockWheels[0],
            status: 'sold'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockWheels)
      });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('68811-17x7.5-2018A')).toBeInTheDocument();
    });

    // Find and click status toggle button
    const toggleButtons = screen.getAllByTitle(/Mark as/i);
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/wheels/1/status', expect.objectContaining({
        method: 'PATCH'
      }));
    });
  });

  test('displays error message when fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch wheels/i)).toBeInTheDocument();
    });
  });

  test('shows loading state', async () => {
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(mockWheels)
      }), 100))
    );

    render(<App />);
    
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
  });

  test('prints label when print button clicked', async () => {
    window.open = jest.fn();

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('68811-17x7.5-2018A')).toBeInTheDocument();
    });

    const printButtons = screen.getAllByTitle('Print Label');
    fireEvent.click(printButtons[0]);

    expect(window.open).toHaveBeenCalledWith('/api/wheels/1/label', '_blank');
  });

  test('displays correct grade badges', async () => {
    render(<App />);
    
    await waitFor(() => {
      const gradeBadges = screen.getAllByText('A');
      expect(gradeBadges.length).toBeGreaterThan(0);
    });
  });

  test('shows empty state when no wheels in tab', async () => {
    fetch.mockImplementationOnce((url) => {
      if (url.includes('/api/wheels')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          availableCount: 0,
          soldCount: 0,
          availableValue: 0,
          soldValue: 0
        })
      });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/No available wheels found/i)).toBeInTheDocument();
    });
  });
});

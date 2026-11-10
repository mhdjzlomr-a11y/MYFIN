import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

describe('MYFIN App integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a transaction, displays unified Category/Division summary, and supports deleting an entry', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    expect(await screen.findByText('MYFIN')).toBeInTheDocument();
    expect(screen.getAllByText('ഡാഷ്ബോർഡ്').length).toBeGreaterThan(0);

    // Open Add Transaction modal
    fireEvent.click(screen.getAllByText('പുതിയ ഇനം ചേർക്കുക')[0]);

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/തുക/i), { target: { value: '500' } });
    fireEvent.change(within(dialog).getByLabelText(/കുറിപ്പ്/i), { target: { value: 'ഉച്ചഭക്ഷണം' } });
    fireEvent.click(within(dialog).getByText('സേവ് ചെയ്യുക'));

    await waitFor(() => {
      const txSection = screen.getByLabelText('Transactions list');
      expect(within(txSection).getByText('ഉച്ചഭക്ഷണം')).toBeInTheDocument();
    });

    // Click Categories option to view total Income, Expense, and Balance in unified view
    fireEvent.click(screen.getAllByText('വിഭാഗങ്ങൾ')[0]);

    const categorySection = await screen.findByLabelText(
      'Categories and Divisions unified summary',
    );
    expect(within(categorySection).getByTestId('unified-summary-banner')).toHaveTextContent('₹500');

    // Click Food category card to see selected drill-down
    const foodCard = within(categorySection).getByText('ഭക്ഷണം').closest('[role="button"]');
    expect(foodCard).not.toBeNull();
    fireEvent.click(foodCard!);
    expect(await screen.findByTestId('selected-breakdown-panel')).toHaveTextContent('ഉച്ചഭക്ഷണം');

    // Add a new custom category
    fireEvent.click(within(categorySection).getByText('+ പുതിയ വിഭാഗം'));
    fireEvent.change(within(categorySection).getByLabelText(/മലയാളത്തിൽ/i), {
      target: { value: 'ഇന്ധനം' },
    });
    fireEvent.change(within(categorySection).getByLabelText(/ഇംഗ്ലീഷിൽ/i), {
      target: { value: 'Fuel' },
    });
    fireEvent.click(within(categorySection).getByText('ചേർക്കുക'));
    expect((await within(categorySection).findAllByText('ഇന്ധനം')).length).toBeGreaterThan(0);

    // Add a new custom division
    fireEvent.click(within(categorySection).getByText('+ പുതിയ ഡിവിഷൻ'));
    fireEvent.change(within(categorySection).getByLabelText(/മലയാളത്തിൽ/i), {
      target: { value: 'യാത്രാ ഫണ്ട്' },
    });
    fireEvent.change(within(categorySection).getByLabelText(/ഇംഗ്ലീഷിൽ/i), {
      target: { value: 'Travel Fund' },
    });
    fireEvent.click(within(categorySection).getByText('ചേർക്കുക'));
    expect((await within(categorySection).findAllByText('യാത്രാ ഫണ്ട്')).length).toBeGreaterThan(0);

    // Switch back to Dashboard and verify direct Delete on the entry works
    fireEvent.click(screen.getAllByText('ഡാഷ്ബോർഡ്')[0]);
    const txSection = await screen.findByLabelText('Transactions list');
    const deleteBtn = within(txSection).getByLabelText('നീക്കം ചെയ്യുക');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(within(txSection).queryByText('ഉച്ചഭക്ഷണം')).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('supports Reports export buttons, Dark/Normal theme toggle, and Malayalam/English switch', async () => {
    render(<App />);
    expect(await screen.findByText('MYFIN')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('റിപ്പോർട്ടുകൾ')[0]);
    expect(await screen.findByText('CSV ഡൗൺലോഡ്')).toBeInTheDocument();
    expect(screen.getByText('PDF ഡൗൺലോഡ്')).toBeInTheDocument();
    expect(screen.getByText('പ്രിന്റ് ചെയ്യുക')).toBeInTheDocument();

    const themeBtn = screen.getByTitle('ഡാർക്ക് തീം');
    fireEvent.click(themeBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByText('English'));
    expect((await screen.findAllByText('Dashboard')).length).toBeGreaterThan(0);
    expect(screen.getByText('Download CSV')).toBeInTheDocument();
  });
});

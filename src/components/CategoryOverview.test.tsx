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

    expect((await screen.findAllByText('MYFIN')).length).toBeGreaterThan(0);
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
    expect((await screen.findAllByText('MYFIN')).length).toBeGreaterThan(0);

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

    // Switch back to Dashboard and test Search Category dropdown & filtering
    fireEvent.click(screen.getAllByText('Dashboard')[0]);
    const searchInput = screen.getAllByPlaceholderText(/Search note, category/i)[0];
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'Food' } });
    const dropdown = await screen.findByRole('listbox', { name: 'Category search matches' });
    fireEvent.mouseDown(within(dropdown).getByText(/Food/i));

    const categorySection = await screen.findByLabelText(
      'Categories and Divisions unified summary',
    );
    expect(within(categorySection).getByTestId('selected-breakdown-panel')).toHaveTextContent('Food');

    // Open Gmail Cloud Sync modal from top header button
    fireEvent.click(screen.getByLabelText(/Gmail Cloud Sync/i));
    const syncDialog = await screen.findByRole('dialog', { name: /Gmail Cloud Sync/i });
    const configTextarea = within(syncDialog).getByLabelText(/Paste Firebase Config/i);
    expect(configTextarea).toBeInTheDocument();

    fireEvent.change(configTextarea, {
      target: {
        value: JSON.stringify({
          apiKey: 'AIzaTestKey123',
          authDomain: 'myfin-test.firebaseapp.com',
          projectId: 'myfin-test',
          appId: '1:123:web:abc',
        }),
      },
    });
    fireEvent.submit(configTextarea.closest('form')!);
    expect(await within(syncDialog).findByText(/Sign in with Google/i)).toBeInTheDocument();
  });

  it('stores weekly and monthly reports and starts a fresh period cleanly', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    expect((await screen.findAllByText('MYFIN')).length).toBeGreaterThan(0);

    // Add a transaction for today (which falls in both this week and this month)
    fireEvent.click(screen.getAllByText('പുതിയ ഇനം ചേർക്കുക')[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/തുക/i), { target: { value: '1200' } });
    fireEvent.change(within(dialog).getByLabelText(/കുറിപ്പ്/i), { target: { value: 'മാസ ചെലവ്' } });
    fireEvent.click(within(dialog).getByText('സേവ് ചെയ്യുക'));

    await waitFor(() => {
      const txSection = screen.getByLabelText('Transactions list');
      expect(within(txSection).getByText('മാസ ചെലവ്')).toBeInTheDocument();
    });

    // Navigate to Reports via the quick Archive / Reset shortcut on Dashboard
    fireEvent.click(screen.getByText('സ്റ്റോർ / പുതിയത്'));
    const archiveSection = await screen.findByLabelText('ആഴ്ച / മാസം റിപ്പോർട്ട് സ്റ്റോർ & പുതിയ തുടക്കം');

    // Store weekly report manually
    const storeButtons = within(archiveSection).getAllByText('റിപ്പോർട്ട് സ്റ്റോർ ചെയ്യുക');
    fireEvent.click(storeButtons[0]);
    expect(await within(archiveSection).findByText('സ്റ്റോർ ചെയ്തു വെച്ച റിപ്പോർട്ടുകൾ (1)')).toBeInTheDocument();

    // Start a fresh month (archives monthly total & clears active month entries)
    fireEvent.click(within(archiveSection).getByText('പുതിയ മാസം തുടങ്ങുക'));
    expect(await within(archiveSection).findByText('സ്റ്റോർ ചെയ്തു വെച്ച റിപ്പോർട്ടുകൾ (2)')).toBeInTheDocument();

    // Expand details on stored report and confirm archived transaction is preserved
    fireEvent.click(within(archiveSection).getAllByText('വിശദാംശം കാണുക')[0]);
    expect(within(archiveSection).getByText('മാസ ചെലവ്')).toBeInTheDocument();

    // Dashboard should now show ₹0 active balance for fresh month
    fireEvent.click(screen.getAllByText('ഡാഷ്ബോർഡ്')[0]);
    const txSection = await screen.findByLabelText('Transactions list');
    expect(within(txSection).queryByText('മാസ ചെലവ്')).not.toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('browses entries by calendar for specific day, week, month, and overall total', async () => {
    render(<App />);
    expect((await screen.findAllByText('MYFIN')).length).toBeGreaterThan(0);

    // Pre-populate entries across different dates (2026-10-15 & 2026-11-03 & 2026-11-10)
    // Open Calendar tab via Dashboard quick button
    fireEvent.click(screen.getAllByText('കലണ്ടർ')[0]);
    const calSection = await screen.findByLabelText('കലണ്ടർ റിപ്പോർട്ട്');
    expect(calSection).toBeInTheDocument();

    // Add an entry directly on 2026-11-10 via calendar button
    const cell10 = within(calSection).getByLabelText('2026-11-10');
    fireEvent.click(cell10);
    fireEvent.click(screen.getByText('ഈ തീയതിയിൽ ചേർക്കുക'));
    const modal = screen.getByRole('dialog');
    fireEvent.change(within(modal).getByLabelText(/തുക/i), { target: { value: '750' } });
    fireEvent.change(within(modal).getByLabelText(/കുറിപ്പ്/i), { target: { value: 'പത്താം തീയതി ചെലവ്' } });
    fireEvent.click(within(modal).getByText('സേവ് ചെയ്യുക'));

    const reportPanel = await screen.findByLabelText('Selected calendar report');
    await waitFor(() => {
      expect(within(reportPanel).getByText('പത്താം തീയതി ചെലവ്')).toBeInTheDocument();
    });

    // Add another entry in a different week (2026-11-03) and check Day vs Week vs Month vs Overall
    fireEvent.click(within(calSection).getByLabelText('2026-11-03'));
    fireEvent.click(screen.getByText('ഈ തീയതിയിൽ ചേർക്കുക'));
    const modal2 = screen.getByRole('dialog');
    fireEvent.change(within(modal2).getByLabelText(/തുക/i), { target: { value: '300' } });
    fireEvent.change(within(modal2).getByLabelText(/കുറിപ്പ്/i), { target: { value: 'മൂന്നാം തീയതി ചെലവ്' } });
    fireEvent.click(within(modal2).getByText('സേവ് ചെയ്യുക'));

    await waitFor(() => {
      expect(within(reportPanel).getByText('മൂന്നാം തീയതി ചെലവ്')).toBeInTheDocument();
      expect(within(reportPanel).queryByText('പത്താം തീയതി ചെലവ്')).not.toBeInTheDocument();
    });

    // Switch to Week containing 2026-11-10 (Mon 09 - Sun 15) -> shows 750 but NOT 300
    fireEvent.click(within(calSection).getByLabelText('2026-11-10'));
    fireEvent.click(within(calSection).getByText('തിരഞ്ഞെടുത്ത ആഴ്ച'));
    expect(within(reportPanel).getByText('പത്താം തീയതി ചെലവ്')).toBeInTheDocument();
    expect(within(reportPanel).queryByText('മൂന്നാം തീയതി ചെലവ്')).not.toBeInTheDocument();

    // Switch to Selected Month -> shows BOTH 750 and 300
    fireEvent.click(within(calSection).getByText(/തിരഞ്ഞെടുത്ത മാസം/i));
    expect(within(reportPanel).getByText('പത്താം തീയതി ചെലവ്')).toBeInTheDocument();
    expect(within(reportPanel).getByText('മൂന്നാം തീയതി ചെലവ്')).toBeInTheDocument();

    // Switch to Overall Total -> shows BOTH as well
    fireEvent.click(within(calSection).getByText('മൊത്തം റിപ്പോർട്ട്'));
    expect(within(reportPanel).getByText('₹1,050')).toBeInTheDocument();
  });
});

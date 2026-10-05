import { render, screen, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SecureDataMaskComponent } from './secure-data-mask.component';

const AADHAAR = '9876-5432-1234';
const MASKED = 'XXXX-XXXX-1234';
const REVEAL_MS = 10_000;

/**
 * Security-critical behaviour of the reveal timeout.
 * Uses Vitest fake timers (Jest-compatible API) + Angular Testing Library,
 * the Angular equivalent of Jest + React Testing Library.
 */
describe('SecureDataMaskComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(
    inputs: Partial<{ value: string; label: string; revealDurationMs: number }> = {},
  ) {
    // advanceTimers lets user-event's internal delays run on the fake clock.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const view = await render(SecureDataMaskComponent, {
      inputs: { value: AADHAAR, label: 'Aadhaar number', ...inputs },
    });
    const valueText = () => screen.getByTestId('sdm-value').textContent?.trim();
    const liveRegion = () => screen.getByRole('status');
    return { user, view, valueText, liveRegion };
  }

  it('renders the value masked by default and never puts the full value in the DOM', async () => {
    const { view, valueText } = await setup();

    expect(valueText()).toBe(MASKED);
    expect(view.container.textContent).not.toContain('9876');
    expect(screen.getByRole('button', { name: 'Tap to reveal Aadhaar number' })).toBeTruthy();
  });

  it('reveals on click, then re-masks after 10 seconds and clears the value from state', async () => {
    const { user, view, valueText, liveRegion } = await setup();
    const component = view.fixture.componentInstance;

    // 1. Simulate the user clicking "Tap to reveal"
    await user.click(screen.getByRole('button', { name: /tap to reveal aadhaar number/i }));
    view.detectChanges();

    // 2. Verify the text is unmasked and the state change is announced
    expect(valueText()).toBe(AADHAAR);
    expect(component.isRevealed()).toBe(true);
    expect(liveRegion().textContent).toContain('Aadhaar number revealed');
    expect(screen.getByRole('button', { name: 'Hide Aadhaar number' })).toBeTruthy();

    // Still revealed just before the deadline
    vi.advanceTimersByTime(REVEAL_MS - 1);
    view.detectChanges();
    expect(valueText()).toBe(AADHAAR);

    // 3. Fast-forward past the 10 second security timeout
    vi.advanceTimersByTime(1);
    view.detectChanges();

    // 4. Assert it is securely masked again
    expect(valueText()).toBe(MASKED);
    expect(component.isRevealed()).toBe(false);
    expect(
      (component as unknown as { revealedValue: () => string | null }).revealedValue(),
    ).toBeNull();
    expect(view.container.textContent).not.toContain('9876');
    expect(liveRegion().textContent).toContain(
      'Aadhaar number hidden automatically after 10 seconds',
    );
    expect(screen.getByRole('button', { name: 'Tap to reveal Aadhaar number' })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0); // no leaked timeout/interval
  });

  it('is keyboard operable (Tab to focus, Enter to reveal, Space to hide)', async () => {
    const { user, view, valueText } = await setup();

    await user.tab();
    const button = screen.getByRole('button', { name: /tap to reveal/i });
    expect(document.activeElement).toBe(button);

    await user.keyboard('{Enter}');
    view.detectChanges();
    expect(valueText()).toBe(AADHAAR);
    expect(document.activeElement).toBe(button); // focus is not lost when the label changes

    await user.keyboard(' ');
    view.detectChanges();
    expect(valueText()).toBe(MASKED);
  });

  it('wires up ARIA relationships for assistive technology', async () => {
    await setup();
    const button = screen.getByRole('button', { name: /tap to reveal/i });

    const controls = button.getAttribute('aria-controls')!;
    const describedBy = button.getAttribute('aria-describedby')!;
    expect(document.getElementById(controls)).toBeTruthy();
    expect(document.getElementById(describedBy)?.textContent).toContain('hidden automatically');
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    // Masked glyphs are hidden from screen readers; a spoken summary is provided instead.
    expect(screen.getByTestId('sdm-value').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(/ends in 1 2 3 4/i)).toBeTruthy();
  });

  it('cancels the pending timeout when the user hides manually', async () => {
    const { user, view, valueText, liveRegion } = await setup();

    await user.click(screen.getByRole('button', { name: /tap to reveal/i }));
    await user.click(screen.getByRole('button', { name: /hide/i }));
    view.detectChanges();

    expect(valueText()).toBe(MASKED);
    expect(liveRegion().textContent?.trim()).toBe('Aadhaar number hidden.');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts the full 10 second window when revealed again', async () => {
    const { user, view, valueText } = await setup();

    await user.click(screen.getByRole('button', { name: /tap to reveal/i }));
    vi.advanceTimersByTime(8_000);
    await user.click(screen.getByRole('button', { name: /hide/i }));
    await user.click(screen.getByRole('button', { name: /tap to reveal/i }));

    vi.advanceTimersByTime(8_000); // 16s since first reveal, 8s since second
    view.detectChanges();
    expect(valueText()).toBe(AADHAAR);

    vi.advanceTimersByTime(2_000);
    view.detectChanges();
    expect(valueText()).toBe(MASKED);
  });

  it('re-masks immediately when the page is hidden (tab switch / app backgrounded)', async () => {
    const { user, view, valueText } = await setup();
    await user.click(screen.getByRole('button', { name: /tap to reveal/i }));

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    view.detectChanges();
    visibility.mockRestore();

    expect(valueText()).toBe(MASKED);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears timers and the revealed value when destroyed', async () => {
    const { user, view } = await setup();
    await user.click(screen.getByRole('button', { name: /tap to reveal/i }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    view.fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports a configurable reveal duration', async () => {
    const { user, view, valueText } = await setup({ revealDurationMs: 3_000 });
    await user.click(screen.getByRole('button', { name: /tap to reveal/i }));

    vi.advanceTimersByTime(3_000);
    view.detectChanges();
    expect(valueText()).toBe(MASKED);
  });
});

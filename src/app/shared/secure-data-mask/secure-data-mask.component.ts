import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { formatIdentifier, maskValue, visibleTail } from '../utils/mask';

export type HideReason = 'user' | 'timeout' | 'page-hidden' | 'value-changed';

let nextId = 0;

/**
 * Renders a sensitive string masked by default (e.g. XXXX-XXXX-1234) with a
 * "Tap to reveal" button. Once revealed, the plain value is held in local state
 * for `revealDurationMs` (10 s by default), then re-masked AND cleared.
 *
 * Security notes
 *  - The plain value only exists in `revealedValue` while revealed; it is set
 *    back to `null` on timeout, manual hide, tab switch, input change and destroy.
 *  - While masked, the full value is never written to the DOM.
 *
 * Accessibility (WCAG 2.2 AA)
 *  - Native <button> => focusable, Enter/Space activation, visible focus ring.
 *  - Button has a full accessible name ("Tap to reveal Aadhaar number") and
 *    aria-controls the value region; aria-describedby explains the auto-hide.
 *  - A polite live region (role="status") announces reveal/hide, including the
 *    automatic re-mask, so screen-reader users always know the current state.
 *  - Masked glyphs are aria-hidden and replaced by a spoken summary ("Hidden. Ends in 1 2 3 4").
 *  - Countdown/progress are decorative (aria-hidden) and respect prefers-reduced-motion.
 */
@Component({
  selector: 'app-secure-data-mask',
  templateUrl: './secure-data-mask.component.html',
  styleUrl: './secure-data-mask.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sdm',
    '[class.sdm--revealed]': 'isRevealed()',
  },
})
export class SecureDataMaskComponent {
  /** The sensitive value, e.g. a mock Aadhaar number. */
  readonly value = input.required<string>();
  /** Human-readable name used in the button and announcements, e.g. "Aadhaar number". */
  readonly label = input.required<string>();
  /** Trailing characters left visible while masked. */
  readonly visibleChars = input(4);
  /** How long the value stays revealed before auto re-masking. */
  readonly revealDurationMs = input(10_000);
  /** Whether the live region reads the revealed value aloud (character by character). */
  readonly announceValue = input(true);

  /** Emits true on reveal and false on hide - useful for audit logging. */
  readonly revealedChange = output<boolean>();

  protected readonly ids = (() => {
    const base = `sdm-${++nextId}`;
    return { value: `${base}-value`, hint: `${base}-hint` };
  })();

  /** The ONLY place the unmasked value is held. `null` whenever masked. */
  private readonly revealedValue = signal<string | null>(null);
  protected readonly plainValue = this.revealedValue.asReadonly();

  readonly isRevealed = computed(() => this.revealedValue() !== null);
  /** Visible button text; the accessible name extends it with the label (WCAG 2.5.3 label-in-name). */
  protected readonly actionText = computed(() => (this.isRevealed() ? 'Hide' : 'Tap to reveal'));
  protected readonly masked = computed(() => maskValue(this.value(), this.visibleChars()));
  protected readonly spokenTail = computed(() =>
    [...visibleTail(this.value(), this.visibleChars())].join(' '),
  );
  protected readonly durationSeconds = computed(() => Math.ceil(this.revealDurationMs() / 1000));
  protected readonly secondsLeft = signal(0);
  protected readonly announcement = signal('');

  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const doc = inject(DOCUMENT);
    const onVisibilityChange = () => {
      if (doc.visibilityState === 'hidden') this.hide('page-hidden');
    };
    doc.addEventListener('visibilitychange', onVisibilityChange);

    inject(DestroyRef).onDestroy(() => {
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      this.clearTimers();
      this.revealedValue.set(null);
    });

    // If the parent swaps the value while it is revealed, re-mask immediately.
    effect(() => {
      this.value();
      untracked(() => this.hide('value-changed', { silent: true }));
    });
  }

  toggle(): void {
    if (this.isRevealed()) {
      this.hide('user');
    } else {
      this.reveal();
    }
  }

  reveal(): void {
    this.clearTimers();
    const plain = formatIdentifier(this.value());
    const duration = this.revealDurationMs();

    this.revealedValue.set(plain);
    this.secondsLeft.set(this.durationSeconds());
    this.announcement.set(
      `${this.label()} revealed${this.announceValue() ? `: ${spellOut(plain)}` : ''}. ` +
        `It will be hidden again in ${this.durationSeconds()} seconds.`,
    );

    // The security timeout: re-mask and clear state after `duration` ms.
    this.hideTimer = setTimeout(() => this.hide('timeout'), duration);
    this.countdownTimer = setInterval(
      () => this.secondsLeft.update((s) => Math.max(0, s - 1)),
      1000,
    );
    this.revealedChange.emit(true);
  }

  hide(reason: HideReason = 'user', { silent = false } = {}): void {
    this.clearTimers();
    if (!this.isRevealed()) return;

    this.revealedValue.set(null); // clear the unmasked value from component state
    this.secondsLeft.set(0);
    if (!silent) {
      const why =
        reason === 'timeout'
          ? ` automatically after ${this.durationSeconds()} seconds`
          : reason === 'page-hidden'
            ? ' because you left the page'
            : '';
      this.announcement.set(`${this.label()} hidden${why}.`);
    } else {
      this.announcement.set('');
    }
    this.revealedChange.emit(false);
  }

  private clearTimers(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.hideTimer = null;
    this.countdownTimer = null;
  }
}

/** "9876-5432-1234" -> "9 8 7 6, 5 4 3 2, 1 2 3 4" so screen readers read digits, not "nine thousand…". */
function spellOut(value: string): string {
  return value
    .split(/[\s-]+/)
    .map((group) => [...group].join(' '))
    .join(', ');
}

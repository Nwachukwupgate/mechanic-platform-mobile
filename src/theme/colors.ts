// Primary scale aligned with product green #16a34a; forest anchor #0c2e1a
export const colors = {
  /** Homepage / marketing anchor */
  brand: {
    forest: '#0c2e1a',
    primary: '#16a34a',
    highlight: '#4ade80',
    page: '#f1f5f4',
    /** Non-badge accents (e.g. tiles) — aligns with statusBadge.paid */
    paid: '#15803d',
    paidBg: '#dcfce7',
    /** Aligns with statusBadge.requested */
    requestedBg: '#fff7ed',
    requestedFg: '#c2410c',
    /** Aligns with statusBadge.expired */
    expiredBg: '#f1f5f9',
    expiredFg: '#475569',
  },
  /**
   * Booking status chips — soft fill + strong text (~AA for small type).
   * REQUESTED = attention, ACCEPTED = confirmed, IN_PROGRESS = active, DONE/PAID/DELIVERED = success stages, EXPIRED = inactive.
   */
  statusBadge: {
    requested: { bg: '#fff7ed', fg: '#c2410c' },
    accepted: { bg: '#ede9fe', fg: '#5b21b6' },
    inProgress: { bg: '#e0f2fe', fg: '#0369a1' },
    done: { bg: '#ecfdf5', fg: '#047857' },
    paid: { bg: '#dcfce7', fg: '#15803d' },
    delivered: { bg: '#ecfdf5', fg: '#047857' },
    expired: { bg: '#f1f5f9', fg: '#475569' },
    unknown: { bg: '#e2e8f0', fg: '#334155' },
  },
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#0c2e1a',
  },
  accent: {
    50: '#fdf4ed',
    100: '#fae6d6',
    200: '#f5ccad',
    300: '#efab79',
    400: '#e88a46',
    500: '#e37028',
    600: '#E68324',
    700: '#c96a1a',
    800: '#a35616',
    900: '#7a4012',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    violet: '#8b5cf6',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  /** Slight green cast — easy on eyes for long sessions */
  background: '#f1f5f4',
  surface: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
}

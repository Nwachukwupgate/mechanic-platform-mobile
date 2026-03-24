/** Values sent to the API; labels are user-facing. */
export const USER_DELETE_REASON_OPTIONS = [
  { value: 'not_using', label: 'I no longer use the service' },
  { value: 'privacy', label: 'Privacy or data concerns' },
  { value: 'another_app', label: 'I switched to another app' },
  { value: 'experience', label: 'Poor experience or quality' },
  { value: 'support', label: 'Customer support issues' },
  { value: 'pricing', label: 'Pricing or fees' },
  { value: 'other', label: 'Other' },
] as const

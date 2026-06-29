/** Letters, spaces, and . , / ; : ( ) - { } [ ] — must match backend leadTextNormalization.ts */
export const LEAD_CITY_ALLOWED_REGEX = /^[A-Za-z\s.,/;:\-(){}[\]]+$/;

export const LEAD_CITY_ERROR_MESSAGE =
  "City can only contain English letters, spaces, and these symbols: . , / ; : ( ) - { } [ ]";

export function isValidLeadCity(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return LEAD_CITY_ALLOWED_REGEX.test(trimmed);
}

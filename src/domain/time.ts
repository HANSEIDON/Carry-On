/** "21:45" in the given IANA time zone. */
export function localTime(tz: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
}

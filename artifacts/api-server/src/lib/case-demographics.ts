/** Case birth dates are stored as calendar dates without a time zone. */
export function isValidDob(dob: unknown): dob is string {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const date = new Date(`${dob}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dob;
}

export function ageOnDate(dob: string, today = new Date()): number | null {
  if (!isValidDob(dob)) return null;
  const [year, month, day] = dob.split("-").map(Number);
  return today.getUTCFullYear() - year -
    (today.getUTCMonth() + 1 < month ||
      (today.getUTCMonth() + 1 === month && today.getUTCDate() < day) ? 1 : 0);
}
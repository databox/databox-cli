/**
 * ProfileResponse.cs `ProfileResponse`, read by profile info and returned by profile update: a user
 * at the organization level, whose `account` is null.
 */
export const profile = {
  account: null,
  createdAt: '2024-01-01T00:00:00+00:00',
  email: 'test@example.com',
  id: 1,
  isEmailVerified: true,
  metadata: {department: 'engineering', role: 'software_engineer', title: 'Lead'},
  name: 'Test User',
  organization: {id: 100, name: 'Acme Org'},
  role: 'admin',
  timezone: 'UTC',
}

/** A user whose home is an account within the organization. */
export const accountProfile = {
  ...profile,
  account: {id: 200, name: 'Acme Retail'},
}

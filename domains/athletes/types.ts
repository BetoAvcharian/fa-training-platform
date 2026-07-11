export type MembershipRole = 'manager' | 'coach' | 'athlete'
export type MembershipStatus = 'invitado' | 'activo' | 'inactivo'

export interface Membership {
  id: string
  organizationId: string
  personId: string | null
  invitedEmail: string | null
  role: MembershipRole
  status: MembershipStatus
  coachMembershipId: string | null
  createdAt: string
}

export interface Person {
  id: string
  authUserId: string | null
  firstName: string
  lastName: string
  email: string
}

export interface RosterEntry {
  id: string
  role: MembershipRole
  status: MembershipStatus
  person: {
    firstName: string
    lastName: string
    email: string
  } | null
}

export interface InviteMemberInput {
  organizationId: string
  email: string
  role: MembershipRole
  coachMembershipId?: string
}

export interface ReassignAthleteCoachInput {
  athleteMembershipId: string
  newCoachMembershipId: string
}

export interface DeactivateMemberInput {
  membershipId: string
  organizationId: string
}

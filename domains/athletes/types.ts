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

export interface SignUpManagerInput {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

export interface SignUpCoachInput {
  email: string
  password: string
  firstName: string
  lastName: string
  joinCode: string
}

export interface SignUpAthleteInput {
  email: string
  password: string
  firstName: string
  lastName: string
  coachMembershipId: string
}

export interface Group {
  id: string
  organizationId: string
  name: string
  createdAt: string
}

export interface CreateGroupInput {
  organizationId: string
  name: string
}

export interface CoachDirectoryEntry {
  membershipId: string
  name: string
  organizationName: string
}

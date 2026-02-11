export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked"

export interface InvitationView {
  readonly id: string
  readonly status: InvitationStatus
}

export interface MembershipView {
  readonly id: string
}

export interface ProfileView {
  readonly id: string
}

export interface UserMessengerView {
  readonly userId: string
}

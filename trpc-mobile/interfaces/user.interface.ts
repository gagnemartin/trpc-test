export interface Session {
  token: string
  user: {
    uid: string
    email: string
  }
}
export type User = {
  id: string
  profile: Profile
}
export type Profile = {
  id: string
  createdAt: string
  updatedAt: string | null
  displayName: string | null
  userId: string
}

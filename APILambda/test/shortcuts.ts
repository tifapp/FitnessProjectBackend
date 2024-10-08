import { TestUser } from "../global"

export const userToUserRequest = (fromUser: TestUser, toUser: TestUser) => ({ auth: fromUser.auth, params: { userId: toUser.id } })

export const blockedUserResponse = (userId: string) => ({ status: 403, data: { error: "blocked-you", userId } })

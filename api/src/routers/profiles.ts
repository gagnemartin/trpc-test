import { z } from "zod"
import { authedProcedure, createTRPCRouter } from "../trpc"
import { TRPCError } from "@trpc/server"
import { profiles } from "../database/schema"
import { ne } from "drizzle-orm"

const profilesRouter = createTRPCRouter({
  getProfileByUserId: authedProcedure
    .input(
      z.object({
        userId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.profiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, input.userId)
      })

      if (!profile) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return profile
    }),

  getProfiles: authedProcedure
  .query(async ({ ctx }) => {
    const response = await ctx.db.select().from(profiles).where(() => ne(profiles.userId, ctx.user.id)).limit(50)

    return response
  })
})

export default profilesRouter
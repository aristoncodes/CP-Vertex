import { IUserRepo } from "../repositories/IUserRepo"

export class AwardXPCommand {
  constructor(private userId: string, private xp: number, private source: string) {}

  async execute(repo: IUserRepo): Promise<void> {
    await repo.incrementXP(this.userId, this.xp)
    // Here we'd also emit a realtime event using something like Pusher or Supabase
    // e.g., await emitXPGain(this.userId, this.xp, this.source)
    console.log(`[AwardXPCommand] Awarded ${this.xp} XP to ${this.userId} from ${this.source}`)
  }
}

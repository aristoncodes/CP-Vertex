type DuelStatus = 'pending' | 'active' | 'completed' | 'expired' | 'declined'

const TRANSITIONS: Record<DuelStatus, DuelStatus[]> = {
  pending:   ['active', 'declined', 'expired'],
  active:    ['completed', 'expired'],
  completed: [],
  expired:   [],
  declined:  [],
}

export function canTransition(from: DuelStatus, to: DuelStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function assertTransition(from: DuelStatus, to: DuelStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`)
  }
}

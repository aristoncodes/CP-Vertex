export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private readonly threshold = 3
  private readonly timeout = 60_000  // 60 seconds

  isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure < this.timeout) return true
      this.failures = 0  // half-open: try again
    }
    return false
  }

  recordFailure() { 
    this.failures++
    this.lastFailure = Date.now() 
  }
  
  recordSuccess() { 
    this.failures = 0 
  }
}

export const cfBreaker = new CircuitBreaker()

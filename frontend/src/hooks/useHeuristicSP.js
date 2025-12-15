export function useHeuristicSP() {
  const estimate = (title, desc) => {
    const text = (title + " " + desc).toLowerCase()
    let basePoints = 3

    // Complexity keywords with different weights
    const complexityPatterns = {
      high: /auth|login|security|payment|integration|migration|refactor|architecture|performance|optimization|analytics|machine learning|ai|blockchain/g,
      medium: /api|database|crud|form|validation|testing|deployment|configuration|notification|email|upload/g,
      low: /button|text|color|styling|layout|spacing|alignment|icon|image|link/g,
    }

    // Type-based estimation
    if (/bug|fix|hotfix/i.test(text)) {
      basePoints = 2
    } else if (/story|feature|epic/i.test(text)) {
      basePoints = 5
    } else if (/task|chore/i.test(text)) {
      basePoints = 3
    }

    // Adjust based on complexity keywords
    const highMatches = (text.match(complexityPatterns.high) || []).length
    const mediumMatches = (text.match(complexityPatterns.medium) || []).length
    const lowMatches = (text.match(complexityPatterns.low) || []).length

    // Calculate complexity score
    const complexityScore = highMatches * 3 + mediumMatches * 1.5 + lowMatches * 0.5

    // Text length factor (longer descriptions = more complex)
    const lengthFactor = Math.min(text.length / 200, 2)

    // Special modifiers
    const multiplierKeywords = /multiple|several|various|complex|advanced|sophisticated/g
    const multiplier = (text.match(multiplierKeywords) || []).length > 0 ? 1.5 : 1

    // Calculate final story points
    let storyPoints = Math.round(basePoints + complexityScore + lengthFactor)
    storyPoints = Math.round(storyPoints * multiplier)

    // Ensure it's within Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
    const fibonacci = [1, 2, 3, 5, 8, 13, 21]
    const closest = fibonacci.reduce((prev, curr) =>
      Math.abs(curr - storyPoints) < Math.abs(prev - storyPoints) ? curr : prev,
    )

    return closest
  }

  return { estimate }
}

interface Question {
  id: string;
  timeLimit?: number;
  [key: string]: any;
}

/**
 * Calculates the total time limit for a game based on the sum of individual question time limits
 * @param questions Array of questions with timeLimit property
 * @returns Total time in seconds, or null if no questions have time limits
 */
export function calculateTotalGameTime(questions: Question[]): number | null {
  if (!questions || questions.length === 0) {
    return null;
  }

  const totalSeconds = questions.reduce((total, question) => {
    const timeLimit = question.timeLimit || 60; // Default 60 seconds
    return total + timeLimit;
  }, 0);

  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Formats time in seconds to a human-readable string
 * @param seconds Time in seconds
 * @returns Formatted time string (e.g., "5 minutes", "90 seconds")
 */
export function formatGameTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Updates game settings with calculated total time from questions
 * @param questions Array of questions
 * @param currentSettings Current game settings
 * @returns Updated settings with calculated timeLimit
 */
export function updateGameTimeFromQuestions(
  questions: Question[], 
  currentSettings: any = {}
): any {
  const calculatedTime = calculateTotalGameTime(questions);
  
  return {
    ...currentSettings,
    timeLimit: calculatedTime,
    // Add a flag to indicate this was auto-calculated
    autoCalculatedTime: calculatedTime !== null
  };
}
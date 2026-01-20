/**
 * Normalizes a CSV header string to camelCase format
 * 
 * @param key - The CSV header string to normalize (e.g., "First Name", "email_address", "Job-Title")
 * @returns The normalized camelCase string (e.g., "firstName", "emailAddress", "jobTitle")
 */
export function normalizeToCamelCase(key: string): string {
    const trimmed = key.toString().trim();
    
    // Split by spaces, hyphens, underscores, or other non-alphanumeric characters
    const words = trimmed.split(/[\s\-_]+/).filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    
    // First word is lowercase, subsequent words are capitalized
    const camelCase = words
        .map((word, index) => {
            const lowerWord = word.toLowerCase();
            return index === 0 
                ? lowerWord 
                : lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
        })
        .join('');
    
    return camelCase;
}


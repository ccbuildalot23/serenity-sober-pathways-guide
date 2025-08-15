export class EnhancedInputValidator {
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    return input.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  }

  static validateTextInput(input: string, options?: { maxLength?: number; _allowedPatterns?: RegExp[] }): boolean {
    if (typeof input !== 'string') return false;
    const max = options?.maxLength ?? 5000;
    if (input.length === 0 || input.length > max) return false;
    if (options?._allowedPatterns && options._allowedPatterns.length > 0) {
      return options._allowedPatterns.some((re) => re.test(input));
    }
    return true;
  }
}



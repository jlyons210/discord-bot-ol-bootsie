export class Utilities {

  /**
   * Sanitizes Discord usernames to fit OpenAI's name field requirements
   * @param name Unchecked username
   * @returns Sanitized username
   */
  public static sanitizeName(name: string | undefined): string | undefined {
    if (name) {
      const expOpenAiAllowed = /^[a-zA-Z0-9_-]{1,64}$/;
      const expReplace = /[^a-zA-Z0-9_-]/g;
      const sanitized = name.replace(expReplace, '_');
      return (expOpenAiAllowed.test(sanitized)) ? sanitized : undefined;
    }
    else {
      return name;
    }
  }

}
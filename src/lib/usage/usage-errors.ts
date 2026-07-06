export class UsageLimitError extends Error {
  constructor(message = "Ai folosit toate operațiunile incluse în perioada curentă.") {
    super(message);
    this.name = "UsageLimitError";
  }
}

export class UsageUnavailableError extends Error {
  constructor(message = "Informațiile de utilizare nu au putut fi verificate.") {
    super(message);
    this.name = "UsageUnavailableError";
  }
}

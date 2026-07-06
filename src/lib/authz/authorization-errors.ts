export class AuthorizationError extends Error {
  status = 403;

  constructor(message = "Nu ai permisiunea necesară pentru această acțiune.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthorizationUnavailableError extends Error {
  status = 503;

  constructor(message = "Nu am putut verifica permisiunile momentan. Încearcă din nou.") {
    super(message);
    this.name = "AuthorizationUnavailableError";
  }
}

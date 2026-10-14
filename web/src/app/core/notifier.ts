import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError } from './api-error';

/** Shows short messages in a snackbar. */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snackBar = inject(MatSnackBar);

  info(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }

  error(error: unknown): void {
    const message = error instanceof ApiError ? error.detail : 'Something went wrong.';
    this.snackBar.open(message, 'Dismiss', { duration: 6000 });
  }
}

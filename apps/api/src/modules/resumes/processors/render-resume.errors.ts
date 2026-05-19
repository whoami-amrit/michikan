/**
 * Centralized error messages for PDF rendering pipeline.
 * All possible errors are defined here for easy tracking and extension.
 */

export enum RenderErrorEnum {
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  FAILED_CREATE_DIRECTORY = 'FAILED_CREATE_DIRECTORY',
  FAILED_RENDER_LATEX = 'FAILED_RENDER_LATEX',
  PDF_COMPILATION_TIMEOUT = 'PDF_COMPILATION_TIMEOUT',
  PDFLATEX_NOT_FOUND = 'PDFLATEX_NOT_FOUND',
  PDF_COMPILATION_FAILED = 'PDF_COMPILATION_FAILED',
  PDF_OUTPUT_NOT_FOUND = 'PDF_OUTPUT_NOT_FOUND',
  S3_CREDENTIALS_INVALID = 'S3_CREDENTIALS_INVALID',
  S3_BUCKET_NOT_FOUND = 'S3_BUCKET_NOT_FOUND',
  S3_UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  DB_UPDATE_FAILED = 'DB_UPDATE_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class RenderErrors extends Error {
  private static readonly errorMessages: Record<RenderErrorEnum, string> = {
    [RenderErrorEnum.TEMPLATE_NOT_FOUND]: 'Template not found',
    [RenderErrorEnum.FAILED_CREATE_DIRECTORY]: 'Failed to create working directory',
    [RenderErrorEnum.FAILED_RENDER_LATEX]: 'Failed to render LaTeX from template',
    [RenderErrorEnum.PDF_COMPILATION_TIMEOUT]: 'PDF compilation timeout',
    [RenderErrorEnum.PDFLATEX_NOT_FOUND]: 'pdflatex not found',
    [RenderErrorEnum.PDF_COMPILATION_FAILED]: 'PDF compilation failed',
    [RenderErrorEnum.PDF_OUTPUT_NOT_FOUND]: 'PDF output file not found',
    [RenderErrorEnum.S3_CREDENTIALS_INVALID]: 'S3 credentials invalid',
    [RenderErrorEnum.S3_BUCKET_NOT_FOUND]: 'S3 bucket not found',
    [RenderErrorEnum.S3_UPLOAD_FAILED]: 'S3 upload failed',
    [RenderErrorEnum.DB_UPDATE_FAILED]: 'Failed to update job status in database',
    [RenderErrorEnum.UNKNOWN_ERROR]: 'An unknown error occurred',
  };

  constructor(
    public readonly errorType: RenderErrorEnum,
    additionalError?: Error,
  ) {
    const baseMessage = RenderErrors.errorMessages[errorType];
    const message = additionalError
      ? `${baseMessage}: ${String(additionalError).slice(0, 255)}`
      : baseMessage;

    super(message);
    this.name = 'RenderError';

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, RenderErrors.prototype);
  }

  /**
   * Extract error type from a string that contains the error message.
   * Returns the corresponding enum value if found, null otherwise.
   */
  static extractErrorType(message: string): RenderErrorEnum | null {
    for (const [errorType, errorMessage] of Object.entries(this.errorMessages)) {
      if (message.includes(errorMessage)) {
        return errorType as RenderErrorEnum;
      }
    }
    return null;
  }

  static getMessageForErrorType(errorType: RenderErrorEnum): string {
    return this.errorMessages[errorType];
  }
}

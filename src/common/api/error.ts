import { ApiErrorResponse, PROBLEM_CODE } from "apisauce";

export type ErrorResponse = {
  status?: number;
  data?: any;
  error?: string;
};

export type ApiErrorInfo = {
  problem: PROBLEM_CODE;
  status: number;
  data?: ErrorResponse;
};

export class ApiError extends Error {
  public errorInfo: ApiErrorInfo;
  constructor(response: ApiErrorResponse<ErrorResponse>) {
    // Backend error format: { status: 400, data: null, error: "..." }
    // Only check for error field from backend response
    const message = response?.data?.error ?? response.problem;
    super(message);
    this.errorInfo = {
      problem: response.problem,
      status: response.status ?? 500,
      data: response.data,
    };
  }
}

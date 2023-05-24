export interface IError {
  status: number;
  message: string;
  details?: any;
  cause: any;
}

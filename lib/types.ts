export type Todo = {
  readonly todoID: string;
  readonly content: string;
  readonly complete: boolean;
  readonly createdAt: number;
};

export const isTodo = (obj: any): obj is Todo => {
  return 'todoID' in obj && 'content' in obj && 'complete' in obj;
}

export interface Update {
  readonly todoID: string;
  readonly complete: boolean;
};
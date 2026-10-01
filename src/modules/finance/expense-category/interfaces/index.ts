export interface CreateExpenseCategoryInterface {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface UpdateExpenseCategoryInterface {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

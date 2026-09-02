export interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export interface BillItem {
  id?: string;
  amount: string;
  billType: 'income' | 'expense' | 'neutral';
  note?: string;
  source?: string;
  billDate?: string;
  neutral?: boolean;
  category?: { id: string; name: string; icon?: string } | null;
  account?: { id: string; name: string } | null;
}
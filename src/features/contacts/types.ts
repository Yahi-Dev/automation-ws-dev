// Tipos para contacts
export interface ContactsType {
  id: number;
  name: string;
  phone: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  whatsapp: boolean;
  isDeleted: boolean;
  _count?: {
    messages: number;
  };
}

export type CountriesType = []

export interface ContactsResponse {
  success: boolean;
  message: string;
  data?: ContactsType | ContactsType[];
}

export type NameCellProps = {
  row: {
    original: ContactsType
  }
}
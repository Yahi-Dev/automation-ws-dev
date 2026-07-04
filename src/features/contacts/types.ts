// Tipos para contacts
export type ConsentState = "opted_in" | "opted_out" | "unknown";

export interface ContactsType {
  id: number;
  name: string;
  phone: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  whatsapp: boolean;
  consentState: ConsentState;
  consentSource?: string | null;
  consentAt?: Date | null;
  optOutAt?: Date | null;
  optOutKeyword?: string | null;
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
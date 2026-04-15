export interface TemplateField {
  rrwebId: string;
  elementTag: string;
  headerLabel: string | null;
  placeholder: string;
}

export interface SyntheticTemplate {
  sessionId: string;
  generatedAt: number;
  fields: TemplateField[];
}

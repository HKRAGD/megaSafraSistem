/**
 * EXPORT SERVICES - SHARED TYPES
 * Interfaces e tipos compartilhados para os serviços de exportação PDF/Excel
 */

// Interface genérica para definição de colunas de relatório
export interface ReportColumn<T> {
  header: string;
  dataKey: keyof T | ((item: T) => any);
  width?: number; // Para PDF - largura da coluna
  format?: (value: any) => string; // Formatação personalizada
  align?: 'left' | 'center' | 'right'; // Alinhamento
}

// Opções de configuração para exportação
export interface ExportOptions {
  reportTitle: string;
  filtersApplied?: string; // Descrição dos filtros aplicados
  filtersDescription?: string; // Compatibilidade adicional
  includeMetadata?: boolean; // Incluir metadados (data geração, usuário, etc.)
  pdfTheme?: 'grid' | 'striped' | 'plain'; // Tema da tabela PDF
  excelSheetName?: string; // Nome da planilha Excel
  author?: string; // Autor do relatório
  fileName?: string; // Nome do arquivo personalizado
}

// Resultado da operação de exportação
export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// Metadados do relatório
export interface ReportMetadata {
  title?: string;
  generatedAt: Date;
  generatedBy: string;
  reportType?: 'inventory' | 'movements' | 'expiration' | 'capacity';
  totalRecords?: number;
  filtersApplied?: string;
  appliedFilters?: string; // Compatibilidade adicional
}

// Interface para dados formatados prontos para exportação
export interface FormattedExportData<T> {
  headers: string[];
  rows: (string | number)[][];
  metadata: ReportMetadata;
  originalData: T[];
}

// Tipos específicos para cada relatório baseados nos tipos existentes
export type InventoryExportData = {
  productName: string;
  lot: string;
  quantity: number;
  totalWeight: number;
  location?: string;
  chamberName?: string;
  seedTypeName: string;
  clientName?: string;
  status: string;
  entryDate: string;
  expirationDate?: string;
  notes?: string;
};

export type MovementExportData = {
  productName: string;
  movementType: string;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  weight: number;
  timestamp: string;
  userName: string;
  reason?: string;
  notes?: string;
};

export type ExpirationExportData = {
  productName: string;
  lot: string;
  quantity: number;
  totalWeight: number;
  location?: string;
  seedTypeName: string;
  expirationDate: string;
  daysRemaining: number;
  expirationStatus: 'expired' | 'critical' | 'warning' | 'good';
  urgencyLevel: 'high' | 'medium' | 'low';
};

// Configurações específicas para cada tipo de exportação
export interface PDFExportConfig {
  pageOrientation?: 'portrait' | 'landscape';
  fontSize?: number;
  headerColor?: [number, number, number]; // RGB
  headerTextColor?: [number, number, number]; // RGB
  alternateRowColor?: [number, number, number]; // RGB
  cellPadding?: number;
  showPageNumbers?: boolean;
  showGenerationDate?: boolean;
}

export interface ExcelExportConfig {
  sheetName?: string;
  freezeHeader?: boolean;
  autoFilter?: boolean;
  columnWidths?: number[];
  headerStyle?: {
    bold?: boolean;
    backgroundColor?: string;
    fontColor?: string;
  };
}

// Enums para padronização
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'xlsx'
}

export enum ReportType {
  INVENTORY = 'inventory',
  MOVEMENTS = 'movements',
  EXPIRATION = 'expiration'
}

// Utilitários de formatação
export interface FormatUtils {
  formatDate: (date: string | Date) => string;
  formatNumber: (num: number) => string;
  formatCurrency: (value: number) => string;
  formatWeight: (weight: number) => string;
  sanitizeFilename: (filename: string) => string;
}
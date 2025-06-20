/**
 * DEFAULT CONFIGURATIONS
 * Configurações padrão para PDF e Excel
 */

// Configurações padrão para PDF
export const DEFAULT_PDF_CONFIG = {
  pageOrientation: 'landscape' as const,
  fontSize: 8,
  headerColor: [22, 160, 133] as [number, number, number], // Verde Material
  headerTextColor: [255, 255, 255] as [number, number, number], // Branco
  alternateRowColor: [240, 240, 240] as [number, number, number], // Cinza claro
  cellPadding: 3,
  showPageNumbers: true,
  showGenerationDate: true
};

// Configurações padrão para Excel
export const DEFAULT_EXCEL_CONFIG = {
  freezeHeader: true,
  autoFilter: true,
  headerStyle: {
    bold: true,
    backgroundColor: '#16A085', // Verde Material
    fontColor: '#FFFFFF'
  }
};
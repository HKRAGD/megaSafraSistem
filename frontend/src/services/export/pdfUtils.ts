/**
 * PDF UTILITIES
 * Utilitários compartilhados para geração de PDFs
 */

import { jsPDF } from 'jspdf';
import { ReportMetadata } from './types';

/**
 * Adiciona cabeçalho padrão ao PDF
 */
export function addPDFHeader(
  doc: jsPDF,
  title: string,
  metadata: ReportMetadata,
  totalRecords: number,
  recordType: string = 'registros'
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Título principal
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  
  // Linha divisória
  doc.setLineWidth(0.5);
  doc.line(20, 25, pageWidth - 20, 25);
  
  // Informações do relatório
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const infoY = 35;
  doc.text(`Gerado em: ${metadata.generatedAt}`, 20, infoY);
  doc.text(`Total de ${recordType}: ${totalRecords}`, 20, infoY + 5);
  doc.text(`Autor: ${metadata.generatedBy}`, 20, infoY + 10);
  
  // Filtros aplicados (se houver)
  if (metadata.appliedFilters && metadata.appliedFilters.trim()) {
    doc.text(`Filtros: ${metadata.appliedFilters}`, 20, infoY + 15);
  } else if (metadata.filtersApplied && metadata.filtersApplied.trim()) {
    doc.text(`Filtros: ${metadata.filtersApplied}`, 20, infoY + 15);
  }
}

/**
 * Adiciona rodapé padrão ao PDF
 */
export function addPDFFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number
): void {
  doc.setFontSize(8);
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    doc.internal.pageSize.getWidth() - 30,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'right' }
  );
}

/**
 * Configura estilo padrão para cabeçalho de tabela
 */
export function getDefaultTableHeaderStyle() {
  return {
    fillColor: [22, 160, 133] as [number, number, number], // Verde Material
    textColor: [255, 255, 255] as [number, number, number], // Branco
    fontStyle: 'bold',
    halign: 'center' as const,
    fontSize: 8
  };
}

/**
 * Configura estilo padrão para células da tabela
 */
export function getDefaultTableCellStyle() {
  return {
    fontSize: 8,
    cellPadding: 3,
    overflow: 'linebreak' as const,
    halign: 'center' as const
  };
}

/**
 * Configura estilo para linhas alternadas
 */
export function getDefaultAlternateRowStyle() {
  return {
    fillColor: [240, 240, 240] as [number, number, number] // Cinza claro
  };
}
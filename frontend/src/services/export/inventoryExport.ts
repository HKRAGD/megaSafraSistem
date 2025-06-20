/**
 * INVENTORY EXPORT SERVICE
 * Serviços de exportação PDF e Excel para relatórios de inventário
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import { ProductWithRelations } from '../../types';
import {
  ReportColumn,
  ExportOptions,
  InventoryExportData,
  PDFExportConfig,
  ExcelExportConfig,
  ReportMetadata
} from './types';
import { formatUtils } from './formatUtils';
import { DEFAULT_PDF_CONFIG, DEFAULT_EXCEL_CONFIG } from './defaultConfigs';

// Definição das colunas para PDF (com larguras otimizadas para landscape)
const INVENTORY_PDF_COLUMNS: ReportColumn<InventoryExportData>[] = [
  { header: 'Produto', dataKey: 'productName', width: 40, align: 'left' },
  { header: 'Lote', dataKey: 'lot', width: 25, align: 'center' },
  { header: 'Qtde', dataKey: 'quantity', width: 20, align: 'center', format: formatUtils.formatNumber },
  { header: 'Peso (kg)', dataKey: 'totalWeight', width: 25, align: 'right', format: formatUtils.formatWeight },
  { header: 'Localização', dataKey: 'location', width: 30, align: 'center' },
  { header: 'Câmara', dataKey: 'chamberName', width: 25, align: 'center' },
  { header: 'Tipo Semente', dataKey: 'seedTypeName', width: 35, align: 'left' },
  { header: 'Cliente', dataKey: 'clientName', width: 35, align: 'left' },
  { header: 'Status', dataKey: 'status', width: 30, align: 'center', format: formatUtils.formatStatus },
  { header: 'Entrada', dataKey: 'entryDate', width: 25, align: 'center', format: formatUtils.formatDate }
];

// Definição das colunas para Excel (sem limitação de largura)
const INVENTORY_EXCEL_COLUMNS: ReportColumn<InventoryExportData>[] = [
  { header: 'Produto', dataKey: 'productName' },
  { header: 'Lote', dataKey: 'lot' },
  { header: 'Quantidade', dataKey: 'quantity', format: formatUtils.formatNumber },
  { header: 'Peso Total (kg)', dataKey: 'totalWeight', format: (w) => w.toString() },
  { header: 'Localização', dataKey: 'location' },
  { header: 'Câmara', dataKey: 'chamberName' },
  { header: 'Tipo de Semente', dataKey: 'seedTypeName' },
  { header: 'Cliente', dataKey: 'clientName' },
  { header: 'Status', dataKey: 'status', format: formatUtils.formatStatus },
  { header: 'Data de Entrada', dataKey: 'entryDate', format: formatUtils.formatDate },
  { header: 'Data de Expiração', dataKey: 'expirationDate', format: (d) => d ? formatUtils.formatDate(d) : 'N/A' },
  { header: 'Observações', dataKey: 'notes' }
];

/**
 * Converte dados de produto para formato de exportação
 */
function transformProductsToExportData(products: ProductWithRelations[]): InventoryExportData[] {
  return products.map(product => ({
    productName: product.name || 'N/A',
    lot: product.lot || 'N/A',
    quantity: product.quantity || 0,
    totalWeight: product.totalWeight || 0,
    location: product.locationId?.code || 'Aguardando Locação',
    chamberName: product.locationId?.chamberId?.name || 'N/A',
    seedTypeName: product.seedTypeId?.name || 'N/A',
    clientName: product.clientId?.name || 'N/A',
    status: product.status || 'N/A',
    entryDate: product.entryDate || '',
    expirationDate: product.expirationDate || undefined,
    notes: product.notes || ''
  }));
}

/**
 * Gera cabeçalho do PDF com informações do relatório
 */
function addPDFHeader(
  doc: jsPDF, 
  reportTitle: string, 
  metadata: ReportMetadata,
  filtersApplied?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Título principal
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Informações do relatório
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftColumn = 14;
  const rightColumn = pageWidth - 14;

  // Lado esquerdo
  doc.text(`Data de Geração: ${formatUtils.formatDateTime(metadata.generatedAt)}`, leftColumn, currentY);
  doc.text(`Gerado por: ${metadata.generatedBy}`, leftColumn, currentY + 6);
  doc.text(`Total de Registros: ${metadata.totalRecords}`, leftColumn, currentY + 12);

  // Lado direito (se houver filtros)
  if (filtersApplied) {
    doc.text('Filtros Aplicados:', rightColumn, currentY, { align: 'right' });
    doc.text(filtersApplied, rightColumn, currentY + 6, { align: 'right' });
  }

  return currentY + 25; // Retorna Y onde a tabela deve começar
}

/**
 * Exporta dados de inventário para PDF
 */
export async function exportInventoryPdf(
  products: ProductWithRelations[],
  options: ExportOptions,
  config: Partial<PDFExportConfig> = {}
): Promise<void> {
  try {
    const finalConfig = { ...DEFAULT_PDF_CONFIG, ...config };
    const exportData = transformProductsToExportData(products);
    
    // Criar documento PDF
    const doc = new jsPDF({
      orientation: finalConfig.pageOrientation,
      unit: 'mm',
      format: 'a4'
    });

    // Metadados do relatório
    const metadata: ReportMetadata = {
      generatedAt: new Date(),
      generatedBy: options.author || 'Sistema',
      reportType: 'inventory',
      totalRecords: products.length,
      filtersApplied: options.filtersApplied
    };

    // Adicionar cabeçalho
    const tableStartY = addPDFHeader(doc, options.reportTitle, metadata, options.filtersApplied);

    // Preparar dados da tabela
    const tableHeaders = INVENTORY_PDF_COLUMNS.map(col => col.header);
    const tableData = exportData.map(item =>
      INVENTORY_PDF_COLUMNS.map(col => {
        const value = typeof col.dataKey === 'function' 
          ? col.dataKey(item) 
          : item[col.dataKey as keyof InventoryExportData];
        
        return col.format ? col.format(value) : (value?.toString() || 'N/A');
      })
    );

    // Configurar colunas com larguras
    const columnStyles = INVENTORY_PDF_COLUMNS.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as { [key: number]: { cellWidth: number } });

    // Gerar tabela
    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: tableStartY,
      theme: 'grid',
      headStyles: {
        fillColor: finalConfig.headerColor,
        textColor: [255, 255, 255],
        fontSize: finalConfig.fontSize,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: finalConfig.fontSize - 1,
        textColor: [50, 50, 50]
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: finalConfig.alternateRowColor
      },
      margin: { top: 10, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data: any) => {
        // Rodapé com número da página
        if (finalConfig.showPageNumbers) {
          const pageNumber = data.pageNumber;
          const pageCount = (doc as any).getNumberOfPages?.() || pageNumber;
          doc.setFontSize(8);
          doc.text(
            `Página ${pageNumber} de ${pageCount}`, 
            doc.internal.pageSize.getWidth() - 14, 
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        }
      }
    });

    // Gerar nome do arquivo e salvar
    const filename = formatUtils.generateFilename(options.reportTitle, 'pdf');
    doc.save(filename);

  } catch (error) {
    console.error('Erro ao gerar PDF de inventário:', error);
    throw new Error('Falha ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}

/**
 * Exporta dados de inventário para Excel
 */
export async function exportInventoryExcel(
  products: ProductWithRelations[],
  options: ExportOptions,
  config: Partial<ExcelExportConfig> = {}
): Promise<void> {
  try {
    const finalConfig = { ...DEFAULT_EXCEL_CONFIG, ...config };
    const exportData = transformProductsToExportData(products);

    // Preparar dados da planilha
    const headers = INVENTORY_EXCEL_COLUMNS.map(col => col.header);
    const data = exportData.map(item =>
      INVENTORY_EXCEL_COLUMNS.map(col => {
        const value = typeof col.dataKey === 'function'
          ? col.dataKey(item)
          : item[col.dataKey as keyof InventoryExportData];
        
        return col.format ? col.format(value) : (value || '');
      })
    );

    // Criar planilha
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Configurar larguras das colunas (auto-ajuste)
    const colWidths = headers.map((_, colIndex) => {
      const columnData = wsData.map(row => row[colIndex]?.toString() || '');
      const maxLength = Math.max(...columnData.map(cell => cell.length));
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }; // Entre 10 e 50 caracteres
    });
    ws['!cols'] = colWidths;

    // Configurar filtro automático
    if (finalConfig.autoFilter) {
      ws['!autofilter'] = { ref: `A1:${String.fromCharCode(65 + headers.length - 1)}${wsData.length}` };
    }

    // Configurar congelamento de cabeçalho
    if (finalConfig.freezeHeader) {
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const sheetName = options.excelSheetName || 'Inventário';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Adicionar metadados
    wb.Props = {
      Title: options.reportTitle,
      Subject: 'Relatório de Inventário',
      Author: options.author || 'Sistema de Câmaras Refrigeradas',
      CreatedDate: new Date()
    };

    // Gerar e salvar arquivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const filename = formatUtils.generateFilename(options.reportTitle, 'xlsx');
    FileSaver.saveAs(new Blob([wbout], { type: 'application/octet-stream' }), filename);

  } catch (error) {
    console.error('Erro ao gerar Excel de inventário:', error);
    throw new Error('Falha ao gerar o relatório Excel. Por favor, tente novamente.');
  }
}
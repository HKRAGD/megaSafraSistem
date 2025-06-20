/**
 * EXPIRATION EXPORT SERVICE
 * Serviços de exportação PDF e Excel para relatórios de expiração
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import {
  ReportColumn,
  ExportOptions,
  ExpirationExportData,
  PDFExportConfig,
  ExcelExportConfig,
  ReportMetadata
} from './types';
import { formatUtils } from './formatUtils';
import { DEFAULT_PDF_CONFIG, DEFAULT_EXCEL_CONFIG } from './defaultConfigs';

// Definição das colunas para PDF (com larguras otimizadas para landscape)
const EXPIRATION_PDF_COLUMNS: ReportColumn<ExpirationExportData>[] = [
  { header: 'Produto', dataKey: 'productName', width: 40, align: 'left' },
  { header: 'Lote', dataKey: 'lot', width: 25, align: 'center' },
  { header: 'Tipo', dataKey: 'seedTypeName', width: 30, align: 'left' },
  { header: 'Localização', dataKey: 'location', width: 25, align: 'center' },
  { header: 'Qtde', dataKey: 'quantity', width: 20, align: 'center', format: formatUtils.formatNumber },
  { header: 'Peso (kg)', dataKey: 'totalWeight', width: 25, align: 'right', format: formatUtils.formatWeight },
  { header: 'Vencimento', dataKey: 'expirationDate', width: 25, align: 'center', format: formatUtils.formatDate },
  { header: 'Dias Rest.', dataKey: 'daysRemaining', width: 20, align: 'center', format: (d) => d > 0 ? d.toString() : 'VENCIDO' },
  { header: 'Status', dataKey: 'expirationStatus', width: 25, align: 'center', format: formatUtils.formatExpirationStatus }
];

// Definição das colunas para Excel
const EXPIRATION_EXCEL_COLUMNS: ReportColumn<ExpirationExportData>[] = [
  { header: 'Produto', dataKey: 'productName' },
  { header: 'Lote', dataKey: 'lot' },
  { header: 'Tipo de Semente', dataKey: 'seedTypeName' },
  { header: 'Localização', dataKey: 'location' },
  { header: 'Quantidade', dataKey: 'quantity', format: formatUtils.formatNumber },
  { header: 'Peso Total (kg)', dataKey: 'totalWeight', format: (w) => w.toString() },
  { header: 'Data de Vencimento', dataKey: 'expirationDate', format: formatUtils.formatDate },
  { header: 'Dias Restantes', dataKey: 'daysRemaining', format: (d) => d > 0 ? d.toString() : 'VENCIDO' },
  { header: 'Status de Expiração', dataKey: 'expirationStatus', format: formatUtils.formatExpirationStatus },
  { header: 'Nível de Urgência', dataKey: 'urgencyLevel' }
];

/**
 * Converte dados de produto para formato de exportação de expiração
 */
function transformProductsToExpirationData(products: any[]): ExpirationExportData[] {
  return products.map(product => {
    const now = new Date();
    const expirationDate = product.expirationDate ? new Date(product.expirationDate) : null;
    const daysRemaining = expirationDate ? 
      Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;

    // Determinar status de expiração
    let expirationStatus: 'expired' | 'critical' | 'warning' | 'good';
    let urgencyLevel: 'high' | 'medium' | 'low';

    if (daysRemaining < 0) {
      expirationStatus = 'expired';
      urgencyLevel = 'high';
    } else if (daysRemaining <= 7) {
      expirationStatus = 'critical';
      urgencyLevel = 'high';
    } else if (daysRemaining <= 30) {
      expirationStatus = 'warning';
      urgencyLevel = 'medium';
    } else {
      expirationStatus = 'good';
      urgencyLevel = 'low';
    }

    return {
      productName: product.name || 'N/A',
      lot: product.lot || 'N/A',
      quantity: product.quantity || 0,
      totalWeight: product.totalWeight || 0,
      location: product.locationId?.code || product.location?.code || 'Aguardando Locação',
      seedTypeName: product.seedTypeId?.name || product.seedType?.name || 'N/A',
      expirationDate: product.expirationDate || '',
      daysRemaining,
      expirationStatus,
      urgencyLevel
    };
  });
}

/**
 * Gera cabeçalho do PDF com informações do relatório de expiração
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

  // Adicionar legenda de cores/status
  currentY += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Legenda de Status:', leftColumn, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text('VENCIDO: Produto já expirado', leftColumn, currentY + 5);
  doc.text('CRÍTICO: Expira em até 7 dias', leftColumn, currentY + 10);
  doc.text('ATENÇÃO: Expira em até 30 dias', leftColumn, currentY + 15);
  doc.text('BOM: Mais de 30 dias para expirar', leftColumn, currentY + 20);

  return currentY + 30; // Retorna Y onde a tabela deve começar
}

/**
 * Obtém cor para status de expiração (para PDF)
 */
function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case 'expired': return [220, 53, 69]; // Vermelho
    case 'critical': return [255, 193, 7]; // Amarelo
    case 'warning': return [255, 152, 0]; // Laranja
    case 'good': return [40, 167, 69]; // Verde
    default: return [108, 117, 125]; // Cinza
  }
}

/**
 * Exporta dados de expiração para PDF
 */
export async function exportExpirationPdf(
  products: any[],
  options: ExportOptions,
  config: Partial<PDFExportConfig> = {}
): Promise<void> {
  try {
    const finalConfig = { ...DEFAULT_PDF_CONFIG, ...config };
    const exportData = transformProductsToExpirationData(products);
    
    // Ordenar por urgência (produtos vencidos primeiro, depois por dias restantes)
    exportData.sort((a, b) => {
      if (a.expirationStatus === 'expired' && b.expirationStatus !== 'expired') return -1;
      if (b.expirationStatus === 'expired' && a.expirationStatus !== 'expired') return 1;
      return a.daysRemaining - b.daysRemaining;
    });
    
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
      reportType: 'expiration',
      totalRecords: products.length,
      filtersApplied: options.filtersApplied
    };

    // Adicionar cabeçalho
    const tableStartY = addPDFHeader(doc, options.reportTitle, metadata, options.filtersApplied);

    // Preparar dados da tabela
    const tableHeaders = EXPIRATION_PDF_COLUMNS.map(col => col.header);
    const tableData = exportData.map(item =>
      EXPIRATION_PDF_COLUMNS.map(col => {
        const value = typeof col.dataKey === 'function' 
          ? col.dataKey(item) 
          : item[col.dataKey as keyof ExpirationExportData];
        
        return col.format ? col.format(value) : (value?.toString() || 'N/A');
      })
    );

    // Configurar colunas com larguras
    const columnStyles = EXPIRATION_PDF_COLUMNS.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as { [key: number]: { cellWidth: number } });

    // Gerar tabela com colorização condicional
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
      didParseCell: (data: any) => {
        // Colorir linha baseada no status de expiração
        if (data.section === 'body') {
          const rowData = exportData[data.row.index];
          if (rowData) {
            const statusColor = getStatusColor(rowData.expirationStatus);
            
            // Aplicar cor mais suave para o fundo da linha
            data.cell.styles.fillColor = [
              Math.min(255, statusColor[0] + 40),
              Math.min(255, statusColor[1] + 40),
              Math.min(255, statusColor[2] + 40)
            ];
            
            // Se for vencido, destacar mais
            if (rowData.expirationStatus === 'expired') {
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fillColor = statusColor;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
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
    console.error('Erro ao gerar PDF de expiração:', error);
    throw new Error('Falha ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}

/**
 * Exporta dados de expiração para Excel
 */
export async function exportExpirationExcel(
  products: any[],
  options: ExportOptions,
  config: Partial<ExcelExportConfig> = {}
): Promise<void> {
  try {
    const finalConfig = { ...DEFAULT_EXCEL_CONFIG, ...config };
    const exportData = transformProductsToExpirationData(products);

    // Ordenar por urgência
    exportData.sort((a, b) => {
      if (a.expirationStatus === 'expired' && b.expirationStatus !== 'expired') return -1;
      if (b.expirationStatus === 'expired' && a.expirationStatus !== 'expired') return 1;
      return a.daysRemaining - b.daysRemaining;
    });

    // Preparar dados da planilha
    const headers = EXPIRATION_EXCEL_COLUMNS.map(col => col.header);
    const data = exportData.map(item =>
      EXPIRATION_EXCEL_COLUMNS.map(col => {
        const value = typeof col.dataKey === 'function'
          ? col.dataKey(item)
          : item[col.dataKey as keyof ExpirationExportData];
        
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
    const sheetName = options.excelSheetName || 'Expiração';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Adicionar metadados
    wb.Props = {
      Title: options.reportTitle,
      Subject: 'Relatório de Expiração de Produtos',
      Author: options.author || 'Sistema de Câmaras Refrigeradas',
      CreatedDate: new Date()
    };

    // Gerar e salvar arquivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const filename = formatUtils.generateFilename(options.reportTitle, 'xlsx');
    FileSaver.saveAs(new Blob([wbout], { type: 'application/octet-stream' }), filename);

  } catch (error) {
    console.error('Erro ao gerar Excel de expiração:', error);
    throw new Error('Falha ao gerar o relatório Excel. Por favor, tente novamente.');
  }
}
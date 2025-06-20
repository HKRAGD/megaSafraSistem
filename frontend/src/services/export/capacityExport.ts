/**
 * CAPACITY EXPORT SERVICE
 * Serviços de exportação PDF e Excel para relatórios de capacidade
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import {
  ReportColumn,
  ExportOptions,
  PDFExportConfig,
  ExcelExportConfig,
  ReportMetadata
} from './types';
import { formatUtils } from './formatUtils';
import { DEFAULT_PDF_CONFIG, DEFAULT_EXCEL_CONFIG } from './defaultConfigs';

// Definição da interface para dados de capacidade
export interface CapacityExportData {
  chamberName: string;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  utilizationRate: number;
  locationsTotal: number;
  locationsOccupied: number;
  locationsAvailable: number;
  status: string;
}

// Definição das colunas para PDF (com larguras otimizadas para landscape)
const CAPACITY_PDF_COLUMNS: ReportColumn<CapacityExportData>[] = [
  { header: 'Câmara', dataKey: 'chamberName', width: 40, align: 'left' },
  { header: 'Cap. Total (t)', dataKey: 'totalCapacity', width: 30, align: 'right', format: (w) => formatUtils.formatWeight(w * 1000) },
  { header: 'Cap. Usada (t)', dataKey: 'usedCapacity', width: 30, align: 'right', format: (w) => formatUtils.formatWeight(w * 1000) },
  { header: 'Cap. Disponível (t)', dataKey: 'availableCapacity', width: 35, align: 'right', format: (w) => formatUtils.formatWeight(w * 1000) },
  { header: 'Utilização (%)', dataKey: 'utilizationRate', width: 30, align: 'center', format: (r) => `${Math.round((r > 1 ? r : r * 100))}%` },
  { header: 'Localizações', dataKey: 'locationsOccupied', width: 30, align: 'center', format: (occupied: any) => `${occupied}` },
  { header: 'Status', dataKey: 'status', width: 25, align: 'center' }
];

// Definição das colunas para Excel (sem limitação de largura)
const CAPACITY_EXCEL_COLUMNS: ReportColumn<CapacityExportData>[] = [
  { header: 'Câmara', dataKey: 'chamberName' },
  { header: 'Capacidade Total (kg)', dataKey: 'totalCapacity', format: (w) => (w * 1000).toString() },
  { header: 'Capacidade Usada (kg)', dataKey: 'usedCapacity', format: (w) => (w * 1000).toString() },
  { header: 'Capacidade Disponível (kg)', dataKey: 'availableCapacity', format: (w) => (w * 1000).toString() },
  { header: 'Taxa de Utilização (%)', dataKey: 'utilizationRate', format: (r) => `${Math.round((r > 1 ? r : r * 100))}%` },
  { header: 'Localizações Totais', dataKey: 'locationsTotal', format: formatUtils.formatNumber },
  { header: 'Localizações Ocupadas', dataKey: 'locationsOccupied', format: formatUtils.formatNumber },
  { header: 'Localizações Disponíveis', dataKey: 'locationsAvailable', format: formatUtils.formatNumber },
  { header: 'Status da Câmara', dataKey: 'status' }
];

/**
 * Transforma dados de capacidade brutos em formato de exportação
 */
export function transformCapacityDataToExportData(capacityData: any): CapacityExportData[] {
  if (!capacityData?.data?.chamberAnalysis) {
    console.warn('Dados de capacidade inválidos ou vazios');
    return [];
  }

  return capacityData.data.chamberAnalysis.map((chamber: any, index: number): CapacityExportData => {
    const utilizationRate = chamber.utilizationRate || 0;
    const totalCapacity = chamber.totalCapacity || 0;
    const usedCapacity = chamber.usedCapacity || 0;
    
    // Converter de kg para toneladas (dados vindos em kg, mas queremos exibir em toneladas)
    const totalCapacityTons = totalCapacity / 1000;
    const usedCapacityTons = usedCapacity / 1000;
    const availableCapacityTons = (totalCapacity - usedCapacity) / 1000;
    
    // Determinar status baseado na utilização
    let status = 'Normal';
    if (utilizationRate >= 0.9) status = 'Crítico';
    else if (utilizationRate >= 0.7) status = 'Atenção';
    else if (utilizationRate <= 0.2) status = 'Subutilizado';

    return {
      chamberName: chamber.name || `Câmara ${index + 1}`,
      totalCapacity: totalCapacityTons,
      usedCapacity: usedCapacityTons,
      availableCapacity: availableCapacityTons,
      utilizationRate: utilizationRate,
      locationsTotal: chamber.locationsTotal || 0,
      locationsOccupied: chamber.locationsOccupied || 0,
      locationsAvailable: (chamber.locationsTotal || 0) - (chamber.locationsOccupied || 0),
      status
    };
  });
}

/**
 * Adiciona cabeçalho personalizado ao PDF
 */
function addPDFHeader(
  doc: jsPDF,
  title: string,
  metadata: ReportMetadata,
  totalRecords: number
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
  doc.text(`Total de câmaras: ${totalRecords}`, 20, infoY + 5);
  doc.text(`Autor: ${metadata.generatedBy}`, 20, infoY + 10);
  
  // Filtros aplicados (se houver)
  if (metadata.appliedFilters && metadata.appliedFilters.trim()) {
    doc.text(`Filtros: ${metadata.appliedFilters}`, 20, infoY + 15);
  }
}

/**
 * Exporta dados de capacidade para PDF
 */
export async function exportCapacityPdf(
  capacityData: any,
  options: ExportOptions,
  config: Partial<PDFExportConfig> = {}
): Promise<void> {
  try {
    console.log('🔍 DEBUG exportCapacityPdf - Input data:', capacityData);
    
    const finalConfig = { ...DEFAULT_PDF_CONFIG, ...config };
    const exportData = transformCapacityDataToExportData(capacityData);
    
    console.log('🔍 DEBUG exportCapacityPdf - Transformed data:', exportData);
    
    if (exportData.length === 0) {
      throw new Error('Nenhum dado de capacidade encontrado para exportação');
    }

    // Configurar documento PDF em paisagem para mais espaço
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Metadados do relatório
    const metadata: ReportMetadata = {
      title: options.reportTitle,
      generatedAt: new Date(),
      generatedBy: options.author || 'Sistema',
      appliedFilters: options.filtersApplied || options.filtersDescription || 'Todas as câmaras ativas'
    };

    // Adicionar cabeçalho
    addPDFHeader(doc, metadata.title || 'Relatório de Capacidade', metadata, exportData.length);

    // Preparar dados para a tabela
    const tableData = exportData.map(item => 
      CAPACITY_PDF_COLUMNS.map(col => {
        const value = item[col.dataKey as keyof CapacityExportData];
        return col.format ? col.format(value) : value?.toString() || '';
      })
    );

    // Configurar e adicionar tabela
    (doc as any).autoTable({
      head: [CAPACITY_PDF_COLUMNS.map(col => col.header)],
      body: tableData,
      startY: 60,
      styles: {
        fontSize: finalConfig.fontSize,
        cellPadding: finalConfig.cellPadding,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: finalConfig.headerColor,
        textColor: finalConfig.headerTextColor,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: CAPACITY_PDF_COLUMNS.reduce((styles, col, index) => {
        styles[index] = {
          cellWidth: col.width,
          halign: col.align || 'center'
        };
        return styles;
      }, {} as any),
      alternateRowStyles: {
        fillColor: finalConfig.alternateRowColor
      },
      margin: { top: 60, left: 20, right: 20, bottom: 20 },
      didDrawPage: (data: any) => {
        // Rodapé
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageNumber = data.pageNumber;
        doc.setFontSize(8);
        doc.text(
          `Página ${pageNumber} de ${pageCount}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }
    });

    // Adicionar sumário estatístico
    if (capacityData?.summary) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Estatístico:', 20, finalY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summary = capacityData.summary;
      let summaryY = finalY + 8;
      
      doc.text(`• Total de Câmaras: ${summary.totalChambers || exportData.length}`, 25, summaryY);
      summaryY += 5;
      
      if (summary.totalCapacity) {
        doc.text(`• Capacidade Total: ${formatUtils.formatWeight(summary.totalCapacity)}`, 25, summaryY);
        summaryY += 5;
      }
      
      if (summary.totalUsed) {
        doc.text(`• Capacidade Utilizada: ${formatUtils.formatWeight(summary.totalUsed)}`, 25, summaryY);
        summaryY += 5;
      }
      
      if (summary.averageUtilization !== undefined) {
        const avgUtil = summary.averageUtilization > 1 ? summary.averageUtilization : summary.averageUtilization * 100;
        doc.text(`• Utilização Média: ${Math.round(avgUtil)}%`, 25, summaryY);
      }
    }

    // Gerar nome do arquivo
    const fileName = options.fileName || formatUtils.generateFilename('relatorio-capacidade', 'pdf');
    
    // Salvar arquivo
    doc.save(fileName);
    
    console.log(`✅ PDF de capacidade exportado: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Erro ao exportar PDF de capacidade:', error);
    throw error;
  }
}

/**
 * Exporta dados de capacidade para Excel
 */
export async function exportCapacityExcel(
  capacityData: any,
  options: ExportOptions,
  config: Partial<ExcelExportConfig> = {}
): Promise<void> {
  try {
    console.log('🔍 DEBUG exportCapacityExcel - Input data:', capacityData);
    
    const finalConfig = { ...DEFAULT_EXCEL_CONFIG, ...config };
    const exportData = transformCapacityDataToExportData(capacityData);
    
    console.log('🔍 DEBUG exportCapacityExcel - Transformed data:', exportData);
    
    if (exportData.length === 0) {
      throw new Error('Nenhum dado de capacidade encontrado para exportação');
    }

    // Criar workbook
    const workbook = XLSX.utils.book_new();
    
    // Preparar dados para planilha
    const worksheetData = [
      // Cabeçalho com informações do relatório
      ['RELATÓRIO DE CAPACIDADE DAS CÂMARAS'],
      [`Gerado em: ${formatUtils.formatDate(new Date())}`],
      [`Total de câmaras: ${exportData.length}`],
      [`Autor: ${options.author || 'Sistema'}`],
      [''],
      
      // Cabeçalhos das colunas
      CAPACITY_EXCEL_COLUMNS.map(col => col.header),
      
      // Dados das câmaras
      ...exportData.map(item =>
        CAPACITY_EXCEL_COLUMNS.map(col => {
          const value = item[col.dataKey as keyof CapacityExportData];
          return col.format ? col.format(value) : value;
        })
      )
    ];

    // Adicionar sumário se disponível
    if (capacityData?.summary) {
      const summary = capacityData.summary;
      worksheetData.push(
        [''],
        ['RESUMO ESTATÍSTICO'],
        [`Total de Câmaras: ${summary.totalChambers || exportData.length}`]
      );
      
      if (summary.totalCapacity) {
        worksheetData.push([`Capacidade Total: ${formatUtils.formatWeight(summary.totalCapacity)}`]);
      }
      
      if (summary.totalUsed) {
        worksheetData.push([`Capacidade Utilizada: ${formatUtils.formatWeight(summary.totalUsed)}`]);
      }
      
      if (summary.averageUtilization !== undefined) {
        const avgUtil = summary.averageUtilization > 1 ? summary.averageUtilization : summary.averageUtilization * 100;
        worksheetData.push([`Utilização Média: ${Math.round(avgUtil)}%`]);
      }
    }

    // Criar worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Configurar larguras das colunas
    const columnWidths = CAPACITY_EXCEL_COLUMNS.map(() => ({ wch: 20 }));
    worksheet['!cols'] = columnWidths;
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Capacidade das Câmaras');
    
    // Gerar arquivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Gerar nome do arquivo
    const fileName = options.fileName || formatUtils.generateFilename('relatorio-capacidade', 'xlsx');
    
    // Salvar arquivo
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(blob, fileName);
    
    console.log(`✅ Excel de capacidade exportado: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Erro ao exportar Excel de capacidade:', error);
    throw error;
  }
}
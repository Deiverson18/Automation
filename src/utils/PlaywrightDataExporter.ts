/**
 * Utilitário para exportação padronizada de dados em scripts Playwright
 * Permite comunicação estruturada entre scripts e backend
 */

export interface ExportData {
  [key: string]: any;
}

export interface ExportMetadata {
  timestamp: number;
  scriptId?: string;
  executionId?: string;
  version?: string;
}

export class PlaywrightDataExporter {
  private static readonly EXPORT_PREFIX = 'EXPORT_DATA::';
  private static exportCount = 0;

  /**
   * Exporta dados usando console.log com prefixo padronizado
   * @param data - Dados a serem exportados (deve ser serializável em JSON)
   * @param metadata - Metadados opcionais
   */
  static export(data: ExportData, metadata?: Partial<ExportMetadata>): void {
    try {
      // Validar dados de entrada
      if (!data || typeof data !== 'object') {
        throw new Error('Dados devem ser um objeto válido');
      }

      // Preparar payload com metadados
      const payload = {
        ...data,
        _metadata: {
          timestamp: Date.now(),
          exportIndex: ++this.exportCount,
          ...metadata
        }
      };

      // Serializar e exportar
      const jsonString = JSON.stringify(payload);
      console.log(`${this.EXPORT_PREFIX}${jsonString}`);

    } catch (error) {
      console.error(`[EXPORT_ERROR] Falha ao exportar dados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Exporta um valor simples com chave
   * @param key - Chave do valor
   * @param value - Valor a ser exportado
   * @param metadata - Metadados opcionais
   */
  static exportValue(key: string, value: any, metadata?: Partial<ExportMetadata>): void {
    this.export({ [key]: value }, metadata);
  }

  /**
   * Exporta múltiplos valores de uma vez
   * @param values - Objeto com múltiplos valores
   * @param metadata - Metadados opcionais
   */
  static exportMultiple(values: Record<string, any>, metadata?: Partial<ExportMetadata>): void {
    this.export(values, metadata);
  }

  /**
   * Exporta resultado de uma operação com status
   * @param operation - Nome da operação
   * @param result - Resultado da operação
   * @param status - Status da operação
   * @param metadata - Metadados opcionais
   */
  static exportOperation(
    operation: string, 
    result: any, 
    status: 'success' | 'error' | 'warning' = 'success',
    metadata?: Partial<ExportMetadata>
  ): void {
    this.export({
      operation,
      result,
      status,
      timestamp: Date.now()
    }, metadata);
  }

  /**
   * Exporta dados de uma tabela/lista
   * @param tableName - Nome da tabela
   * @param data - Array de dados
   * @param metadata - Metadados opcionais
   */
  static exportTable(tableName: string, data: any[], metadata?: Partial<ExportMetadata>): void {
    this.export({
      [tableName]: {
        items: data,
        count: data.length,
        timestamp: Date.now()
      }
    }, metadata);
  }

  /**
   * Exporta métricas de performance
   * @param metrics - Objeto com métricas
   * @param metadata - Metadados opcionais
   */
  static exportMetrics(metrics: Record<string, number>, metadata?: Partial<ExportMetadata>): void {
    this.export({
      metrics: {
        ...metrics,
        timestamp: Date.now()
      }
    }, metadata);
  }

  /**
   * Exporta dados de formulário
   * @param formName - Nome do formulário
   * @param formData - Dados do formulário
   * @param metadata - Metadados opcionais
   */
  static exportForm(formName: string, formData: Record<string, any>, metadata?: Partial<ExportMetadata>): void {
    this.export({
      form: {
        name: formName,
        data: formData,
        fieldCount: Object.keys(formData).length,
        timestamp: Date.now()
      }
    }, metadata);
  }

  /**
   * Exporta dados de navegação/URL
   * @param url - URL atual
   * @param title - Título da página
   * @param additionalData - Dados adicionais
   * @param metadata - Metadados opcionais
   */
  static exportNavigation(
    url: string, 
    title?: string, 
    additionalData?: Record<string, any>,
    metadata?: Partial<ExportMetadata>
  ): void {
    this.export({
      navigation: {
        url,
        title,
        timestamp: Date.now(),
        ...additionalData
      }
    }, metadata);
  }

  /**
   * Exporta dados de erro/exceção
   * @param error - Erro ocorrido
   * @param context - Contexto do erro
   * @param metadata - Metadados opcionais
   */
  static exportError(error: Error | string, context?: string, metadata?: Partial<ExportMetadata>): void {
    const errorData = typeof error === 'string' ? { message: error } : {
      message: error.message,
      name: error.name,
      stack: error.stack
    };

    this.export({
      error: {
        ...errorData,
        context,
        timestamp: Date.now()
      }
    }, metadata);
  }

  /**
   * Reseta o contador de exportações
   */
  static resetCounter(): void {
    this.exportCount = 0;
  }

  /**
   * Obtém o número atual de exportações
   */
  static getExportCount(): number {
    return this.exportCount;
  }
}

// Exportar funções de conveniência
export const exportData = PlaywrightDataExporter.export.bind(PlaywrightDataExporter);
export const exportValue = PlaywrightDataExporter.exportValue.bind(PlaywrightDataExporter);
export const exportMultiple = PlaywrightDataExporter.exportMultiple.bind(PlaywrightDataExporter);
export const exportOperation = PlaywrightDataExporter.exportOperation.bind(PlaywrightDataExporter);
export const exportTable = PlaywrightDataExporter.exportTable.bind(PlaywrightDataExporter);
export const exportMetrics = PlaywrightDataExporter.exportMetrics.bind(PlaywrightDataExporter);
export const exportForm = PlaywrightDataExporter.exportForm.bind(PlaywrightDataExporter);
export const exportNavigation = PlaywrightDataExporter.exportNavigation.bind(PlaywrightDataExporter);
export const exportError = PlaywrightDataExporter.exportError.bind(PlaywrightDataExporter);
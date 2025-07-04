import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Camera,
  Download,
  Maximize2,
  X,
  Terminal,
  Activity,
  Database,
  Copy,
  ExternalLink,
  FileText,
  Loader2
} from 'lucide-react';
import { PlaywrightExecution, PlaywrightLog, playwrightService } from '../../services/PlaywrightService';

interface ExecutionPanelProps {
  execution: PlaywrightExecution;
  onClose: () => void;
  isExpanded?: boolean;
}

interface ExecutionResult {
  data: any;
  timestamp: string;
  status: 'success' | 'error';
  metadata?: {
    exportCount?: number;
    lastExportTime?: string;
    dataSize?: number;
  };
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ 
  execution: initialExecution, 
  onClose,
  isExpanded = false 
}) => {
  const [execution, setExecution] = useState(initialExecution);
  const [isFullscreen, setIsFullscreen] = useState(isExpanded);
  const [activeTab, setActiveTab] = useState<'logs' | 'screenshots' | 'data'>('logs');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [copiedData, setCopiedData] = useState(false);

  useEffect(() => {
    const handleExecutionUpdate = (updatedExecution: PlaywrightExecution) => {
      if (updatedExecution.id === execution.id) {
        setExecution(updatedExecution);
      }
    };

    const handleLogAdded = ({ executionId, log }: { executionId: string; log: PlaywrightLog }) => {
      if (executionId === execution.id) {
        setExecution(prev => ({
          ...prev,
          logs: [...prev.logs, log]
        }));
      }
    };

    playwrightService.on('executionUpdated', handleExecutionUpdate);
    playwrightService.on('executionCompleted', handleExecutionUpdate);
    playwrightService.on('executionFailed', handleExecutionUpdate);
    playwrightService.on('executionCancelled', handleExecutionUpdate);
    playwrightService.on('logAdded', handleLogAdded);

    return () => {
      playwrightService.off('executionUpdated', handleExecutionUpdate);
      playwrightService.off('executionCompleted', handleExecutionUpdate);
      playwrightService.off('executionFailed', handleExecutionUpdate);
      playwrightService.off('executionCancelled', handleExecutionUpdate);
      playwrightService.off('logAdded', handleLogAdded);
      
      const handleResultUpdate = ({ executionId, result }: { executionId: string; result: any }) => {
        if (executionId === execution.id) {
          setExecution(prev => ({
            ...prev,
            result
          }));
          
          // Atualizar estado do resultado formatado
          if (result) {
            setExecutionResult({
              data: result,
              timestamp: new Date().toISOString(),
              status: 'success',
              metadata: result._metadata
            });
          }
        }
      };

      playwrightService.on('resultUpdated', handleResultUpdate);

      return () => {
        playwrightService.off('resultUpdated', handleResultUpdate);
      };
    };
  }, [execution.id]);

  // Carregar dados quando a aba de dados for selecionada
  useEffect(() => {
    if (activeTab === 'data' && execution.result && !executionResult) {
      setIsLoadingData(true);
      
      // Simular carregamento (em caso real, poderia buscar dados adicionais)
      setTimeout(() => {
        setExecutionResult({
          data: execution.result,
          timestamp: new Date().toISOString(),
          status: execution.error ? 'error' : 'success',
          metadata: execution.result?._metadata
        });
        setIsLoadingData(false);
      }, 500);
    }
  }, [activeTab, execution.result, executionResult]);

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (execution.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (execution.status) {
      case 'pending':
        return 'Pendente';
      case 'running':
        return 'Executando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      case 'cancelled':
        return 'Cancelado';
      default:
        return execution.status;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const handleCancel = () => {
    if (execution.status === 'running') {
      playwrightService.cancelExecution(execution.id);
    }
  };

  const handleCopyData = async () => {
    if (!executionResult?.data) return;
    
    try {
      const dataString = JSON.stringify(executionResult.data, null, 2);
      await navigator.clipboard.writeText(dataString);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar dados:', error);
    }
  };

  const handleDownloadData = () => {
    if (!executionResult?.data) return;
    
    const dataString = JSON.stringify(executionResult.data, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution-${execution.id}-data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  const formatDataSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderDataValue = (value: any, key?: string, depth = 0): React.ReactNode => {
    const maxDepth = 3;
    
    if (depth > maxDepth) {
      return <span className="text-gray-500 italic">...</span>;
    }
    
    if (value === null) {
      return <span className="text-purple-600 dark:text-purple-400">null</span>;
    }
    
    if (value === undefined) {
      return <span className="text-gray-500 italic">undefined</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-blue-600 dark:text-blue-400">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-green-600 dark:text-green-400">{value}</span>;
    }
    
    if (typeof value === 'string') {
      return <span className="text-orange-600 dark:text-orange-400">"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[]</span>;
      }
      
      return (
        <div className="ml-4">
          <span className="text-gray-600 dark:text-gray-400">[</span>
          {value.slice(0, 10).map((item, index) => (
            <div key={index} className="ml-4">
              <span className="text-gray-500">{index}:</span> {renderDataValue(item, undefined, depth + 1)}
              {index < value.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          {value.length > 10 && (
            <div className="ml-4 text-gray-500 italic">... e mais {value.length - 10} itens</div>
          )}
          <span className="text-gray-600 dark:text-gray-400">]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      
      if (entries.length === 0) {
        return <span className="text-gray-500">{'{}'}</span>;
      }
      
      return (
        <div className="ml-4">
          <span className="text-gray-600 dark:text-gray-400">{'{'}</span>
          {entries.slice(0, 10).map(([objKey, objValue], index) => (
            <div key={objKey} className="ml-4">
              <span className="text-blue-700 dark:text-blue-300 font-medium">"{objKey}"</span>
              <span className="text-gray-500">: </span>
              {renderDataValue(objValue, objKey, depth + 1)}
              {index < entries.length - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          {entries.length > 10 && (
            <div className="ml-4 text-gray-500 italic">... e mais {entries.length - 10} propriedades</div>
          )}
          <span className="text-gray-600 dark:text-gray-400">{'}'}</span>
        </div>
      );
    }
    
    return <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>;
  };

  const renderLogs = () => (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {execution.logs.map((log, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm font-mono ${
            log.level === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
            log.level === 'warn' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
            log.level === 'debug' ? 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400' :
            'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
          }`}
        >
          <div className="flex items-start space-x-2">
            <span className="text-xs opacity-75">
              {log.timestamp.toLocaleTimeString('pt-BR')}
            </span>
            <span className="font-medium text-xs uppercase">
              [{log.level}]
            </span>
            <span className="flex-1">{log.message}</span>
          </div>
          {log.data && (
            <pre className="mt-2 text-xs opacity-75 overflow-x-auto">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderScreenshots = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {execution.screenshots.map((screenshot, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate">{screenshot}</p>
        </motion.div>
      ))}
      {execution.screenshots.length === 0 && (
        <div className="col-span-full text-center py-8 text-gray-500">
          Nenhum screenshot capturado ainda
        </div>
      )}
    </div>
  );

  const renderResult = () => (
    <div className="space-y-4">
      {execution.result ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">
            Resultado da Execução
          </h4>
          <pre className="text-sm text-green-700 dark:text-green-300 overflow-x-auto">
            {JSON.stringify(execution.result, null, 2)}
          </pre>
        </div>
      ) : execution.error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">
            Erro na Execução
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300">
            {execution.error}
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {execution.status === 'running' ? 'Execução em andamento...' : 'Nenhum resultado disponível'}
        </div>
      )}
    </div>
  );

  const renderDataPanel = () => {
    if (isLoadingData) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Carregando dados exportados...</p>
          </div>
        </div>
      );
    }

    if (!executionResult) {
      return (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum dado disponível
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Execute o script para ver os dados exportados aqui.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">console.log('EXPORT_DATA::', JSON.stringify(dados))</code> 
              no seu script para exportar dados.
            </p>
          </div>
        </div>
      );
    }

    const dataSize = JSON.stringify(executionResult.data).length;
    const hasMetadata = executionResult.metadata;

    return (
      <div className="space-y-6">
        {/* Header com informações e ações */}
        <div className={`rounded-lg p-4 ${
          executionResult.status === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                executionResult.status === 'success' ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'
              }`}>
                {executionResult.status === 'success' ? (
                  <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h3 className={`font-medium ${
                  executionResult.status === 'success' 
                    ? 'text-green-800 dark:text-green-400' 
                    : 'text-red-800 dark:text-red-400'
                }`}>
                  Dados Exportados
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(executionResult.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyData}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
                title="Copiar dados"
              >
                {copiedData ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={handleDownloadData}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
                title="Baixar como JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Metadados */}
          {hasMetadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {hasMetadata.exportCount && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Exportações:</span>
                  <br />
                  <span className="text-gray-600 dark:text-gray-400">{hasMetadata.exportCount}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tamanho:</span>
                <br />
                <span className="text-gray-600 dark:text-gray-400">{formatDataSize(dataSize)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Tipo:</span>
                <br />
                <span className="text-gray-600 dark:text-gray-400">
                  {Array.isArray(executionResult.data) ? 'Array' : typeof executionResult.data}
                </span>
              </div>
              {hasMetadata.lastExportTime && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Última exportação:</span>
                  <br />
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(hasMetadata.lastExportTime).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visualização dos dados */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Estrutura dos Dados</span>
            </h4>
          </div>
          
          <div className="p-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
              <div className="font-mono text-sm">
                {renderDataValue(executionResult.data)}
              </div>
            </div>
          </div>
        </div>

        {/* JSON Raw (colapsível) */}
        <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <summary className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <span className="font-medium text-gray-900 dark:text-white">JSON Raw</span>
            <span className="text-sm text-gray-500 ml-2">(clique para expandir)</span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
              <code className="text-gray-800 dark:text-gray-200">
                {JSON.stringify(executionResult.data, null, 2)}
              </code>
            </pre>
          </div>
        </details>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 ${
        isFullscreen ? 'fixed inset-4 z-50' : 'relative'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Execução #{execution.id.slice(-8)}
            </h3>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              <span className="text-sm text-gray-500">
                Iniciado em {execution.startTime.toLocaleString('pt-BR')}
              </span>
              {execution.duration && (
                <span className="text-sm text-gray-500">
                  Duração: {formatDuration(execution.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {execution.status === 'running' && (
            <motion.button
              onClick={handleCancel}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Square className="w-5 h-5" />
            </motion.button>
          )}
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {execution.status === 'running' && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progresso
            </span>
            <span className="text-sm text-gray-500">
              {execution.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${execution.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'logs', label: 'Logs', icon: Terminal },
            { id: 'screenshots', label: 'Screenshots', icon: Camera },
            { id: 'data', label: 'Data', icon: Database }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-label={id === 'data' ? 'View exported data' : `View ${label.toLowerCase()}`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
              {id === 'logs' && execution.logs.length > 0 && (
                <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-1 rounded-full">
                  {execution.logs.length}
                </span>
              )}
              {id === 'screenshots' && execution.screenshots.length > 0 && (
                <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-1 rounded-full">
                  {execution.screenshots.length}
                </span>
              )}
              {id === 'data' && executionResult && (
                <span className="bg-green-200 dark:bg-green-700 text-xs px-2 py-1 rounded-full">
                  ✓
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'screenshots' && renderScreenshots()}
            {activeTab === 'data' && renderDataPanel()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ExecutionPanel;
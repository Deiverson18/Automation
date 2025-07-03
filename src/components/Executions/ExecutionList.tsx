import React from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, XCircle, Clock, AlertCircle, StopCircle } from 'lucide-react';
import { Execution } from '../../types';

interface ExecutionListProps {
  executions: Execution[];
  onCancel: (execution: Execution) => void;
}

const ExecutionList: React.FC<ExecutionListProps> = ({ executions, onCancel }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Executando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      case 'queued':
        return 'Na fila';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <div className="space-y-4">
      {executions.map((execution, index) => (
        <motion.div
          key={execution.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {getStatusIcon(execution.status)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {execution.scriptName}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                    {getStatusText(execution.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div>
                    <span className="font-medium">Início:</span>
                    <br />
                    {new Date(execution.startTime).toLocaleString('pt-BR')}
                  </div>
                  {execution.endTime && (
                    <div>
                      <span className="font-medium">Fim:</span>
                      <br />
                      {new Date(execution.endTime).toLocaleString('pt-BR')}
                    </div>
                  )}
                  {execution.duration && (
                    <div>
                      <span className="font-medium">Duração:</span>
                      <br />
                      {formatDuration(execution.duration)}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">ID:</span>
                    <br />
                    {execution.id}
                  </div>
                </div>
                
                {execution.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                    <strong>Erro:</strong> {execution.error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Logs recentes:
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-32 overflow-y-auto">
                    {execution.logs.slice(-5).map((log, logIndex) => (
                      <div key={logIndex} className="text-sm font-mono">
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className={`ml-2 ${
                          log.level === 'error' ? 'text-red-600' :
                          log.level === 'warn' ? 'text-yellow-600' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          [{log.level.toUpperCase()}] {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {execution.status === 'running' && (
                <motion.button
                  onClick={() => onCancel(execution)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <StopCircle className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ExecutionList;
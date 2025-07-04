import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, Eye, X } from 'lucide-react';
import { PlaywrightExecution, playwrightService } from '../../services/PlaywrightService';
import ExecutionPanel from './ExecutionPanel';

const ExecutionMonitor: React.FC = () => {
  const [executions, setExecutions] = useState<PlaywrightExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<PlaywrightExecution | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Carregar execuções existentes
    setExecutions(playwrightService.getAllExecutions());

    const handleExecutionCreated = (execution: PlaywrightExecution) => {
      setExecutions(prev => [execution, ...prev]);
      setIsVisible(true);
    };

    const handleExecutionUpdated = (execution: PlaywrightExecution) => {
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id ? execution : exec
      ));
    };

    const handleExecutionCompleted = (execution: PlaywrightExecution) => {
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id ? execution : exec
      ));
    };

    const handleExecutionFailed = (execution: PlaywrightExecution) => {
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id ? execution : exec
      ));
    };

    const handleExecutionCancelled = (execution: PlaywrightExecution) => {
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id ? execution : exec
      ));
    };

    playwrightService.on('executionCreated', handleExecutionCreated);
    playwrightService.on('executionUpdated', handleExecutionUpdated);
    playwrightService.on('executionCompleted', handleExecutionCompleted);
    playwrightService.on('executionFailed', handleExecutionFailed);
    playwrightService.on('executionCancelled', handleExecutionCancelled);

    return () => {
      playwrightService.off('executionCreated', handleExecutionCreated);
      playwrightService.off('executionUpdated', handleExecutionUpdated);
      playwrightService.off('executionCompleted', handleExecutionCompleted);
      playwrightService.off('executionFailed', handleExecutionFailed);
      playwrightService.off('executionCancelled', handleExecutionCancelled);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const runningExecutions = executions.filter(exec => exec.status === 'running');
  const recentExecutions = executions.slice(0, 5);

  if (!isVisible && executions.length === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-40"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Monitor de Execuções
                </h3>
                {runningExecutions.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs px-2 py-1 rounded-full">
                    {runningExecutions.length} ativa{runningExecutions.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {recentExecutions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma execução encontrada
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {recentExecutions.map((execution, index) => (
                    <motion.div
                      key={execution.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getStatusIcon(execution.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            #{execution.id.slice(-8)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {execution.startTime.toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {execution.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(execution.duration)}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                          {execution.status === 'running' ? `${execution.progress}%` :
                           execution.status === 'completed' ? 'OK' :
                           execution.status === 'failed' ? 'ERRO' :
                           execution.status === 'cancelled' ? 'CANCEL' : 'PEND'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExecution(execution);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {executions.length > 5 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {/* Implementar visualização completa */}}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Ver todas as execuções ({executions.length})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Panel Modal */}
      <AnimatePresence>
        {selectedExecution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedExecution(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ExecutionPanel
                execution={selectedExecution}
                onClose={() => setSelectedExecution(null)}
                isExpanded={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExecutionMonitor;
import React from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Execution } from '../../types';

interface RecentExecutionsProps {
  executions: Execution[];
}

const RecentExecutions: React.FC<RecentExecutionsProps> = ({ executions }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Execuções Recentes
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Ver todas
        </button>
      </div>

      <div className="space-y-4">
        {executions.slice(0, 5).map((execution, index) => (
          <motion.div
            key={execution.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(execution.status)}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {execution.scriptName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(execution.startTime).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {execution.duration && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDuration(execution.duration)}
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                {execution.status === 'running' ? 'Executando' :
                 execution.status === 'completed' ? 'Concluído' :
                 execution.status === 'failed' ? 'Falhou' :
                 execution.status === 'queued' ? 'Na fila' :
                 execution.status === 'cancelled' ? 'Cancelado' : execution.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentExecutions;
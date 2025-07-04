import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Edit, 
  Trash2, 
  Tag,
  Calendar,
  MoreVertical,
  Copy,
  Eye,
  Activity
} from 'lucide-react';
import { Script } from '../../types';
import ExecutionButton from './ExecutionButton';

// Função auxiliar para converter parâmetros
const convertParametersToObject = (parameters: any): Record<string, any> => {
  if (Array.isArray(parameters)) {
    return parameters.reduce((acc, param) => {
      acc[param.key] = param.value;
      return acc;
    }, {} as Record<string, any>);
  }
  return parameters || {};
};

interface ScriptListEnhancedProps {
  scripts: Script[];
  onEdit: (script: Script) => void;
  onDelete: (script: Script) => void;
  onView: (script: Script) => void;
  onExecutionStart?: (executionId: string) => void;
}

const ScriptListEnhanced: React.FC<ScriptListEnhancedProps> = ({ 
  scripts, 
  onEdit, 
  onDelete, 
  onView,
  onExecutionStart
}) => {
  const [selectedScript, setSelectedScript] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'disabled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'draft':
        return 'Rascunho';
      case 'disabled':
        return 'Desabilitado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {scripts.map((script, index) => (
        <motion.div
          key={script.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {script.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(script.status)}`}>
                    {getStatusText(script.status)}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {script.description}
                </p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Atualizado em {new Date(script.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  {script.tags.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4" />
                      <div className="flex space-x-1">
                        {script.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {script.tags.length > 3 && (
                          <span className="text-xs">+{script.tags.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Execution Controls */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Controles de Execução:
                  </span>
                  <ExecutionButton
                    script={script}
                    onExecutionStart={onExecutionStart}
                    size="sm"
                  />
                  <span className="text-xs text-gray-500">
                    Clique no ícone verde para executar
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={() => onView(script)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Visualizar script"
              >
                <Eye className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                onClick={() => onEdit(script)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Editar script"
              >
                <Edit className="w-4 h-4" />
              </motion.button>
              
              <div className="relative">
                <motion.button
                  onClick={() => setSelectedScript(
                    selectedScript === script.id ? null : script.id
                  )}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MoreVertical className="w-4 h-4" />
                </motion.button>
                
                {selectedScript === script.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-10"
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(script.code);
                        setSelectedScript(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar código</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onDelete(script);
                        setSelectedScript(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ScriptListEnhanced;
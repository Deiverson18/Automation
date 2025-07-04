import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Loader2, Settings } from 'lucide-react';
import { Script } from '../../types';
import { playwrightService } from '../../services/PlaywrightService';

interface ExecutionButtonProps {
  script: Script;
  onExecutionStart?: (executionId: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ExecutionButton: React.FC<ExecutionButtonProps> = ({ 
  script, 
  onExecutionStart,
  disabled = false,
  size = 'md'
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    headless: true,
    screenshots: true,
    timeout: 30000
  });

  const handleExecute = async () => {
    if (isExecuting || disabled || script.status === 'disabled') return;

    try {
      setIsExecuting(true);
      
      // Atualizar configuração do Playwright
      playwrightService.updateConfig({
        headless: config.headless,
        screenshots: config.screenshots,
        timeout: config.timeout
      });

      const executionId = await playwrightService.executeScript(
        script.id,
        script.code,
        script.parameters
      );

      onExecutionStart?.(executionId);

      // Aguardar conclusão ou falha
      const handleCompletion = () => {
        setIsExecuting(false);
        playwrightService.off('executionCompleted', handleCompletion);
        playwrightService.off('executionFailed', handleCompletion);
        playwrightService.off('executionCancelled', handleCompletion);
      };

      playwrightService.on('executionCompleted', handleCompletion);
      playwrightService.on('executionFailed', handleCompletion);
      playwrightService.on('executionCancelled', handleCompletion);

    } catch (error) {
      console.error('Erro ao executar script:', error);
      setIsExecuting(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-1.5';
      case 'lg':
        return 'p-3';
      default:
        return 'p-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  const isDisabled = disabled || script.status === 'disabled' || isExecuting;

  return (
    <div className="relative">
      <div className="flex items-center space-x-1">
        <motion.button
          onClick={handleExecute}
          disabled={isDisabled}
          className={`${getSizeClasses()} ${
            isExecuting
              ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
          } rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          title={
            isExecuting ? 'Executando...' :
            script.status === 'disabled' ? 'Script desabilitado' :
            'Executar script'
          }
        >
          {isExecuting ? (
            <Loader2 className={`${getIconSize()} animate-spin`} />
          ) : (
            <Play className={getIconSize()} />
          )}
        </motion.button>

        <motion.button
          onClick={() => setShowConfig(!showConfig)}
          className={`${getSizeClasses()} text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Configurações de execução"
        >
          <Settings className={getIconSize()} />
        </motion.button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10"
        >
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Configurações de Execução
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Modo Headless
              </label>
              <button
                onClick={() => setConfig(prev => ({ ...prev, headless: !prev.headless }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.headless ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.headless ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Capturar Screenshots
              </label>
              <button
                onClick={() => setConfig(prev => ({ ...prev, screenshots: !prev.screenshots }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.screenshots ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.screenshots ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={config.timeout}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                min="1000"
                max="300000"
                step="1000"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowConfig(false)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ExecutionButton;
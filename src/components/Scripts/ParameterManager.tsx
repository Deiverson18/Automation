import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  Settings, 
  Type, 
  Hash, 
  ToggleLeft,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { ScriptParameter } from '../../types';

interface ParameterManagerProps {
  parameters: ScriptParameter[];
  onChange: (parameters: ScriptParameter[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

const ParameterManager: React.FC<ParameterManagerProps> = ({
  parameters,
  onChange,
  errors = {},
  disabled = false
}) => {
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  const generateId = () => `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addParameter = () => {
    const newParameter: ScriptParameter = {
      id: generateId(),
      key: '',
      value: '',
      type: 'string',
      description: '',
      required: false
    };

    onChange([...parameters, newParameter]);
    setExpandedParam(newParameter.id);
  };

  const updateParameter = (id: string, updates: Partial<ScriptParameter>) => {
    const updatedParameters = parameters.map(param =>
      param.id === id ? { ...param, ...updates } : param
    );
    onChange(updatedParameters);
  };

  const removeParameter = (id: string) => {
    const filteredParameters = parameters.filter(param => param.id !== id);
    onChange(filteredParameters);
    
    if (expandedParam === id) {
      setExpandedParam(null);
    }
  };

  const validateParameterKey = (key: string, currentId: string): string | null => {
    if (!key.trim()) {
      return 'Nome do parâmetro é obrigatório';
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return 'Nome deve começar com letra ou _ e conter apenas letras, números e _';
    }

    const isDuplicate = parameters.some(param => 
      param.id !== currentId && param.key === key
    );

    if (isDuplicate) {
      return 'Nome do parâmetro já existe';
    }

    return null;
  };

  const validateParameterValue = (value: any, type: string): string | null => {
    if (type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return 'Valor deve ser um número válido';
      }
    }

    return null;
  };

  const convertValue = (value: string, type: string): string | number | boolean => {
    switch (type) {
      case 'number':
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      case 'boolean':
        return value === 'true';
      default:
        return value;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <Type className="w-4 h-4" />;
      case 'number':
        return <Hash className="w-4 h-4" />;
      case 'boolean':
        return <ToggleLeft className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      case 'number':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'boolean':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const renderParameterValue = (param: ScriptParameter) => {
    const keyError = validateParameterKey(param.key, param.id);
    const valueError = validateParameterValue(param.value, param.type);

    switch (param.type) {
      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={param.value === true}
                onChange={(e) => updateParameter(param.id, { value: e.target.checked })}
                disabled={disabled}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {param.value ? 'Verdadeiro' : 'Falso'}
              </span>
            </label>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <input
              type="number"
              value={param.value}
              onChange={(e) => updateParameter(param.id, { 
                value: convertValue(e.target.value, param.type) 
              })}
              placeholder="0"
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm ${
                valueError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-label="Parameter value"
            />
            {valueError && (
              <p className="text-xs text-red-600 dark:text-red-400">{valueError}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={param.value}
              onChange={(e) => updateParameter(param.id, { value: e.target.value })}
              placeholder="Valor do parâmetro"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              aria-label="Parameter value"
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Parâmetros do Script
          </h3>
          {parameters.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs px-2 py-1 rounded-full">
              {parameters.length}
            </span>
          )}
        </div>
        
        <motion.button
          onClick={addParameter}
          disabled={disabled}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Parâmetro</span>
        </motion.button>
      </div>

      {/* Informações sobre parâmetros */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
              Como usar parâmetros
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Os parâmetros ficam disponíveis como variáveis no seu script</p>
              <p>• Use nomes descritivos e únicos para cada parâmetro</p>
              <p>• Parâmetros obrigatórios devem ser preenchidos antes da execução</p>
              <p>• Exemplo: parâmetro "username" pode ser usado como <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">username</code> no código</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de parâmetros */}
      <div className="space-y-3">
        <AnimatePresence>
          {parameters.map((param, index) => {
            const keyError = validateParameterKey(param.key, param.id);
            const isExpanded = expandedParam === param.id;

            return (
              <motion.div
                key={param.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Header do parâmetro */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${getTypeColor(param.type)}`}>
                        {getTypeIcon(param.type)}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Nome do parâmetro */}
                        <div>
                          <input
                            type="text"
                            value={param.key}
                            onChange={(e) => updateParameter(param.id, { key: e.target.value })}
                            placeholder="nome_parametro"
                            disabled={disabled}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono ${
                              keyError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            aria-label="Parameter name"
                          />
                          {keyError && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{keyError}</p>
                          )}
                        </div>

                        {/* Tipo do parâmetro */}
                        <div>
                          <select
                            value={param.type}
                            onChange={(e) => updateParameter(param.id, { 
                              type: e.target.value as 'string' | 'number' | 'boolean',
                              value: convertValue(String(param.value), e.target.value)
                            })}
                            disabled={disabled}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="string">Texto</option>
                            <option value="number">Número</option>
                            <option value="boolean">Verdadeiro/Falso</option>
                          </select>
                        </div>

                        {/* Valor do parâmetro */}
                        <div>
                          {renderParameterValue(param)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {/* Botão expandir/recolher */}
                      <button
                        onClick={() => setExpandedParam(isExpanded ? null : param.id)}
                        disabled={disabled}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        aria-label={isExpanded ? "Collapse parameter details" : "Expand parameter details"}
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <HelpCircle className="w-4 h-4" />
                        </motion.div>
                      </button>

                      {/* Botão remover */}
                      <motion.button
                        onClick={() => removeParameter(param.id)}
                        disabled={disabled}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        whileHover={!disabled ? { scale: 1.05 } : {}}
                        whileTap={!disabled ? { scale: 0.95 } : {}}
                        aria-label="Remove parameter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200 dark:border-gray-600"
                    >
                      <div className="p-4 space-y-4">
                        {/* Descrição */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Descrição (opcional)
                          </label>
                          <textarea
                            value={param.description || ''}
                            onChange={(e) => updateParameter(param.id, { description: e.target.value })}
                            placeholder="Descreva o propósito deste parâmetro..."
                            rows={2}
                            disabled={disabled}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>

                        {/* Opções adicionais */}
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={param.required || false}
                              onChange={(e) => updateParameter(param.id, { required: e.target.checked })}
                              disabled={disabled}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Parâmetro obrigatório
                            </span>
                          </label>
                        </div>

                        {/* Preview do uso */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Como usar no script:
                          </p>
                          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                            {param.key ? `const ${param.key} = parameters.${param.key};` : 'Digite um nome para o parâmetro'}
                          </code>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Estado vazio */}
      {parameters.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum parâmetro configurado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Adicione parâmetros para tornar seu script mais flexível e reutilizável.
          </p>
          <button
            onClick={addParameter}
            disabled={disabled}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Primeiro Parâmetro</span>
          </button>
        </div>
      )}

      {/* Erros gerais */}
      {errors.parameters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center space-x-3"
        >
          <AlertCircle className="w-5 h-5" />
          <span>{errors.parameters}</span>
        </motion.div>
      )}

      {/* Resumo dos parâmetros */}
      {parameters.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Resumo dos Parâmetros
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {parameters.map((param) => (
              <div
                key={param.id}
                className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {param.key || 'sem_nome'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(param.type)}`}>
                      {param.type}
                    </span>
                    {param.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Valor: <span className="font-mono">{String(param.value) || 'vazio'}</span>
                </p>
                {param.description && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {param.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParameterManager;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Play, FileText, Tag, Settings, Code, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Script, ScriptParameter } from '../../types';
import ScriptTemplates from './ScriptTemplates';
import ParameterManager from './ParameterManager';

interface ScriptEditorProps {
  script?: Script;
  onSave: (script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ 
  script, 
  onSave, 
  onCancel, 
  isOpen 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'active' | 'disabled',
    parameters: [] as ScriptParameter[]
  });

  const [newTag, setNewTag] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (script) {
      setFormData({
        name: script.name,
        description: script.description,
        code: script.code,
        tags: script.tags,
        status: script.status,
        parameters: Array.isArray(script.parameters) ? script.parameters : []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        tags: [],
        status: 'draft',
        parameters: []
      });
    }
    
    // Limpar erros e feedback ao trocar de script
    setErrors({});
    setFeedback({ type: null, message: '' });
  }, [script]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
    }

    // Validar código
    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (formData.code.trim().length < 10) {
      newErrors.code = 'Código deve ter pelo menos 10 caracteres';
    } else if (formData.code.trim().length > 50000) {
      newErrors.code = 'Código excede o tamanho máximo permitido (50KB)';
    }

    // Validar descrição (opcional, mas se fornecida deve ter tamanho adequado)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrição deve ter no máximo 500 caracteres';
    }

    // Validar tags
    if (formData.tags.length > 10) {
      newErrors.tags = 'Máximo de 10 tags permitidas';
    }

    // Validar parâmetros
    const parameterErrors: string[] = [];
    const parameterKeys = new Set<string>();
    
    formData.parameters.forEach((param, index) => {
      // Validar nome do parâmetro
      if (!param.key.trim()) {
        parameterErrors.push(`Parâmetro ${index + 1}: Nome é obrigatório`);
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param.key)) {
        parameterErrors.push(`Parâmetro ${index + 1}: Nome inválido (use apenas letras, números e _)`);
      } else if (parameterKeys.has(param.key)) {
        parameterErrors.push(`Parâmetro ${index + 1}: Nome duplicado`);
      } else {
        parameterKeys.add(param.key);
      }

      // Validar valor do parâmetro
      if (param.type === 'number' && isNaN(Number(param.value))) {
        parameterErrors.push(`Parâmetro ${param.key || index + 1}: Valor deve ser um número`);
      }
    });

    if (parameterErrors.length > 0) {
      newErrors.parameters = parameterErrors.join('; ');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar feedback anterior
    setFeedback({ type: null, message: '' });
    
    // Validar formulário
    if (!validateForm()) {
      setFeedback({
        type: 'error',
        message: 'Por favor, corrija os erros no formulário'
      });
      return;
    }

    setIsLoading(true);

    try {
      await onSave(formData);
      
      setFeedback({
        type: 'success',
        message: script ? 'Script atualizado com sucesso!' : 'Script criado com sucesso!'
      });

      // Fechar editor após sucesso (com delay para mostrar feedback)
      setTimeout(() => {
        onCancel();
      }, 1500);

    } catch (error) {
      console.error('Erro ao salvar script:', error);
      
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro inesperado ao salvar script'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      if (formData.tags.length >= 10) {
        setErrors({ ...errors, tags: 'Máximo de 10 tags permitidas' });
        return;
      }
      
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
      
      // Limpar erro de tags se existir
      if (errors.tags) {
        const newErrors = { ...errors };
        delete newErrors.tags;
        setErrors(newErrors);
      }
    }
  };

  const handleSelectTemplate = (templateCode: string) => {
    setFormData({
      ...formData,
      code: templateCode
    });
    setShowTemplates(false);
    
    // Limpar erro de código se existir
    if (errors.code) {
      const newErrors = { ...errors };
      delete newErrors.code;
      setErrors(newErrors);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {script ? 'Editar Script' : 'Novo Script'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Code className="w-4 h-4" />
              <span>Templates</span>
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedback.type && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-6 mt-4 p-4 rounded-lg flex items-center space-x-3 ${
              feedback.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
              💡 Sistema de Exportação de Dados
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">console.log('EXPORT_DATA::', JSON.stringify(dados))</code> 
              para exportar dados do seu script. Os dados serão capturados automaticamente pelo backend e exibidos nos resultados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome do Script
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.name ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Digite o nome do script"
                required
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isLoading}
              >
                <option value="draft">Rascunho</option>
                <option value="active">Ativo</option>
                <option value="disabled">Desabilitado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.description ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Descrição do script..."
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-sm flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Adicionar tag..."
                maxLength={20}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={isLoading || !newTag.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
            {errors.tags && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tags}</p>
            )}
          </div>

          {/* Gerenciador de Parâmetros */}
          <ParameterManager
            parameters={formData.parameters}
            onChange={(parameters) => handleInputChange('parameters', parameters)}
            errors={errors}
            disabled={isLoading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Código Playwright
            </label>
            <textarea
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              rows={15}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm ${
                errors.code ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="// Seu código Playwright aqui..."
              required
              disabled={isLoading}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.code}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </form>

        <ScriptTemplates
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      </motion.div>
    </motion.div>
  );
};

export default ScriptEditor;
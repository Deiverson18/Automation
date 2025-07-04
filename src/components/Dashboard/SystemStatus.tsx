import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Container, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface SystemStatusProps {
  className?: string;
}

interface SystemInfo {
  docker: {
    available: boolean;
    securityLevel: 'high' | 'medium' | 'low';
  };
  executionEngine: {
    type: string;
    stats: {
      activeExecutions?: number;
      maxConcurrentExecutions?: number;
    };
  };
  security: {
    isolation: string;
    networkAccess: string;
    fileSystemAccess: string;
  };
}

const SystemStatus: React.FC<SystemStatusProps> = ({ className = '' }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar status do sistema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getSecurityIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <CheckCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="text-center text-gray-500">
          Não foi possível carregar o status do sistema
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Status de Segurança
        </h3>
      </div>

      <div className="space-y-3">
        {/* Docker Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Container className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Docker
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {systemInfo.docker.available ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  Ativo
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  Indisponível
                </span>
              </>
            )}
          </div>
        </div>

        {/* Security Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Nível de Segurança
          </span>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getSecurityLevelColor(systemInfo.docker.securityLevel)}`}>
            {getSecurityIcon(systemInfo.docker.securityLevel)}
            <span className="capitalize">
              {systemInfo.docker.securityLevel === 'high' ? 'Alto' :
               systemInfo.docker.securityLevel === 'medium' ? 'Médio' : 'Baixo'}
            </span>
          </div>
        </div>

        {/* Execution Engine */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Engine de Execução
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {systemInfo.executionEngine.type === 'docker-isolated' ? 'Docker (Isolado)' : 'Padrão'}
          </span>
        </div>

        {/* Active Executions */}
        {systemInfo.executionEngine.stats.activeExecutions !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Execuções Ativas
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {systemInfo.executionEngine.stats.activeExecutions} / {systemInfo.executionEngine.stats.maxConcurrentExecutions || 'N/A'}
            </span>
          </div>
        )}
      </div>

      {/* Security Details */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Configurações de Segurança
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Isolamento:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {systemInfo.security.isolation === 'container-based' ? 'Baseado em Contêiner' : 'Baseado em Processo'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Acesso à Rede:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {systemInfo.security.networkAccess === 'blocked' ? 'Bloqueado' : 'Limitado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Sistema de Arquivos:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {systemInfo.security.fileSystemAccess === 'read-only' ? 'Somente Leitura' : 'Sandbox'}
            </span>
          </div>
        </div>
      </div>

      {/* Warning for non-Docker setup */}
      {!systemInfo.docker.available && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400">
                Aviso de Segurança
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Para máxima segurança, instale o Docker para execução isolada de scripts.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SystemStatus;
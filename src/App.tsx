import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { playwrightService } from './services/PlaywrightService';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StatsCard from './components/Dashboard/StatsCard';
import ExecutionChart from './components/Dashboard/ExecutionChart';
import RecentExecutions from './components/Dashboard/RecentExecutions';
import SystemStatus from './components/Dashboard/SystemStatus';
import ScriptListEnhanced from './components/Scripts/ScriptListEnhanced';
import ScriptEditor from './components/Scripts/ScriptEditor';
import ExecutionList from './components/Executions/ExecutionList';
import ExecutionMonitor from './components/Scripts/ExecutionMonitor';
import {
  FileText, 
  Play, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Activity,
  Plus,
  Filter,
  Search,
  Shield,
  AlertCircle,
  Info
} from 'lucide-react';
import { Script, Execution, SystemStats } from './types';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | undefined>(undefined);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Carregar dados iniciais
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setApiError(null);
      
      try {
        const { scripts, executions, stats } = await playwrightService.loadAppData();
        setScripts(scripts);
        setExecutions(executions);
        setStats(stats);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setApiError(error instanceof Error ? error.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Configurar listeners para atualizações em tempo real
    const handleScriptCreated = (script: Script) => {
      setScripts(prev => [script, ...prev]);
    };
    
    const handleScriptUpdated = (script: Script) => {
      setScripts(prev => prev.map(s => s.id === script.id ? script : s));
    };
    
    const handleScriptDeleted = ({ scriptId }: { scriptId: string }) => {
      setScripts(prev => prev.filter(s => s.id !== scriptId));
    };
    
    const handleExecutionCreated = (execution: Execution) => {
      setExecutions(prev => [execution, ...prev]);
    };
    
    const handleExecutionUpdated = (execution: Execution) => {
      setExecutions(prev => prev.map(e => e.id === execution.id ? execution : e));
    };
    
    playwrightService.on('scriptCreated', handleScriptCreated);
    playwrightService.on('scriptUpdated', handleScriptUpdated);
    playwrightService.on('scriptDeleted', handleScriptDeleted);
    playwrightService.on('executionCreated', handleExecutionCreated);
    playwrightService.on('executionUpdated', handleExecutionUpdated);
    
    return () => {
      playwrightService.off('scriptCreated', handleScriptCreated);
      playwrightService.off('scriptUpdated', handleScriptUpdated);
      playwrightService.off('scriptDeleted', handleScriptDeleted);
      playwrightService.off('executionCreated', handleExecutionCreated);
      playwrightService.off('executionUpdated', handleExecutionUpdated);
    };
  }, []);

  if (!user) {
    return <LoginForm />;
  }

  // Mostrar notificação temporária
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };
  const handleCreateScript = () => {
    setEditingScript(undefined);
    setIsEditorOpen(true);
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setIsEditorOpen(true);
  };

  const handleSaveScript = async (scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingScript) {
        // Atualizar script existente 
        await playwrightService.updateScript(editingScript.id, scriptData);
        showNotification('success', `Script "${scriptData.name}" atualizado com sucesso!`);
      } else {
        // Criar novo script
        const newScript = await playwrightService.createScript(scriptData);
        showNotification('success', `Script "${newScript.name}" criado com sucesso!`);
      }
      
      // Fechar editor e limpar estado
      setIsEditorOpen(false);
      setEditingScript(undefined);
      
    } catch (error) {
      console.error('Erro ao salvar script:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado ao salvar script';
      showNotification('error', errorMessage);
      
      // Re-throw para que o ScriptEditor possa mostrar o erro também
      throw error;
    }
  };

  const handleExecuteScript = async (script: Script) => {
    try {
      await playwrightService.executeScript(script.id, script.code, script.parameters);
      showNotification('info', `Execução do script "${script.name}" iniciada!`);
    } catch (error) {
      console.error('Erro ao executar script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao executar script';
      showNotification('error', errorMessage);
    }
  };

  const handleDeleteScript = async (script: Script) => {
    if (window.confirm(`Tem certeza que deseja excluir o script "${script.name}"?`)) {
      try {
        await playwrightService.deleteScript(script.id);
        showNotification('success', `Script "${script.name}" excluído com sucesso!`);
      } catch (error) {
        console.error('Erro ao deletar script:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar script';
        showNotification('error', errorMessage);
      }
    }
  };

  const handleViewScript = (script: Script) => {
    setEditingScript(script);
    setIsEditorOpen(true);
  };

  const handleCancelExecution = async (execution: any) => {
    if (window.confirm(`Tem certeza que deseja cancelar a execução "${execution.scriptName}"?`)) {
      try {
        await playwrightService.cancelExecution(execution.id);
        showNotification('info', `Execução "${execution.scriptName}" cancelada!`);
      } catch (error) {
        console.error('Erro ao cancelar execução:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao cancelar execução';
        showNotification('error', errorMessage);
      }
    }
  };

  const handleExecutionStart = (executionId: string) => {
    console.log('Execução iniciada:', executionId);
    showNotification('info', 'Nova execução iniciada!');
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'scripts':
        return 'Scripts';
      case 'executions':
        return 'Execuções';
      case 'logs':
        return 'Logs';
      case 'analytics':
        return 'Analytics';
      case 'settings':
        return 'Configurações';
      default:
        return 'Dashboard';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Visão geral da plataforma de automação com execução isolada';
      case 'scripts':
        return 'Gerencie e execute seus scripts Playwright com segurança';
      case 'executions':
        return 'Monitore execuções em contêineres isolados';
      case 'logs':
        return 'Visualize logs detalhados do sistema';
      case 'analytics':
        return 'Análise de desempenho e métricas';
      case 'settings':
        return 'Configurações da plataforma';
      default:
        return '';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando dados...</p>
          </div>
        </div>
      );
    }

    if (apiError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Erro ao carregar dados
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{apiError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total de Scripts"
                value={stats?.totalScripts || 0}
                icon={FileText}
                color="bg-blue-500"
                index={0}
              />
              <StatsCard
                title="Scripts Ativos"
                value={stats?.activeScripts || 0}
                icon={Play}
                color="bg-green-500"
                index={1}
              />
              <StatsCard
                title="Execuções Hoje"
                value={stats?.totalExecutions || 0}
                icon={Activity}
                color="bg-purple-500"
                index={2}
              />
              <StatsCard
                title="Taxa de Sucesso"
                value={`${stats?.successRate || 0}%`}
                icon={TrendingUp}
                color="bg-orange-500"
                index={3}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ExecutionChart />
              </div>
              <div className="space-y-6">
                <SystemStatus />
                <RecentExecutions executions={executions} />
              </div>
            </div>
          </div>
        );

      case 'scripts':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar scripts..."
                    className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filtrar</span>
                </button>
              </div>
              <motion.button
                onClick={handleCreateScript}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Script</span>
              </motion.button>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-400">
                    Execução Segura com Docker
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Todos os scripts são executados em contêineres Docker isolados para máxima segurança. 
                    Sem acesso à rede, sistema de arquivos protegido e recursos limitados.
                  </p>
                </div>
              </div>
            </div>

            <ScriptListEnhanced
              scripts={scripts}
              onEdit={handleEditScript}
              onDelete={handleDeleteScript}
              onView={handleViewScript}
              onExecutionStart={handleExecutionStart}
            />
          </div>
        );

      case 'executions':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar execuções..."
                    className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filtrar</span>
                </button>
              </div>
            </div>

            <ExecutionList
              executions={executions}
              onCancel={handleCancelExecution}
            />
          </div>
        );

      case 'logs':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Logs do Sistema
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <div className="space-y-1">
                <div className="text-green-600">[INFO] Sistema iniciado com sucesso</div>
                <div className="text-blue-600">[DEBUG] Carregando configurações...</div>
                <div className="text-yellow-600">[WARN] Timeout configurado para 30s</div>
                <div className="text-gray-600">[INFO] Pronto para receber requisições</div>
                <div className="text-blue-600">[INFO] Docker Engine inicializado</div>
                <div className="text-green-600">[INFO] Contêineres de segurança configurados</div>
                <div className="text-blue-600">[INFO] WebSocket connection estabelecida</div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <ExecutionChart />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Métricas de Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tempo médio de execução</span>
                    <span className="font-medium">{stats?.avgExecutionTime ? (stats.avgExecutionTime / 1000).toFixed(1) : 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Execuções simultâneas</span>
                    <span className="font-medium">{stats?.runningExecutions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fila de execução</span>
                    <span className="font-medium">{stats?.queuedExecutions || 0}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Scripts Mais Utilizados
                </h3>
                <div className="space-y-3">
                  {scripts.slice(0, 3).map((script, index) => (
                    <div key={script.id} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{script.name}</span>
                      <span className="font-medium">{Math.floor(Math.random() * 50) + 10} exec.</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configurações do Docker
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Limite de Memória
                    </label>
                    <input
                      type="text"
                      defaultValue="512m"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Limite de CPU
                    </label>
                    <input
                      type="text"
                      defaultValue="0.5"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timeout Máximo (ms)
                    </label>
                    <input
                      type="number"
                      defaultValue={300000}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Execuções Simultâneas
                    </label>
                    <input
                      type="number"
                      defaultValue={5}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Acesso à rede bloqueado</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Sistema de arquivos somente leitura</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Usuário não-root</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notification Toast */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
            notification.type === 'success' ? 'bg-green-600 text-white' :
            notification.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white'
          }`}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <Info className="w-5 h-5" />}
          <span>{notification.message}</span>
        </motion.div>
      )}
      
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={getTabTitle()}
          subtitle={getTabSubtitle()}
          onRefresh={() => window.location.reload()}
          isLoading={isLoading}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>

      {/* Execution Monitor - Always visible */}
      <ExecutionMonitor />

      <AnimatePresence>
        {isEditorOpen && (
          <ScriptEditor
            script={editingScript}
            onSave={handleSaveScript}
            onCancel={() => {
              setIsEditorOpen(false);
              setEditingScript(undefined);
            }}
            isOpen={isEditorOpen}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
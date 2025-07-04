import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useApi } from './hooks/useApi';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StatsCard from './components/Dashboard/StatsCard';
import ExecutionChart from './components/Dashboard/ExecutionChart';
import RecentExecutions from './components/Dashboard/RecentExecutions';
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
  Search
} from 'lucide-react';
import { Script } from './types';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { 
    scripts, 
    executions, 
    stats, 
    isLoading, 
    createScript, 
    updateScript, 
    deleteScript, 
    executeScript, 
    cancelExecution 
  } = useApi();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | undefined>(undefined);

  if (!user) {
    return <LoginForm />;
  }

  const handleCreateScript = () => {
    setEditingScript(undefined);
    setIsEditorOpen(true);
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setIsEditorOpen(true);
  };

  const handleSaveScript = async (scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingScript) {
      await updateScript(editingScript.id, scriptData);
    } else {
      await createScript(scriptData);
    }
    setIsEditorOpen(false);
    setEditingScript(undefined);
  };

  const handleExecuteScript = async (script: Script) => {
    await executeScript(script.id, script.parameters);
  };

  const handleDeleteScript = async (script: Script) => {
    if (window.confirm('Tem certeza que deseja excluir este script?')) {
      await deleteScript(script.id);
    }
  };

  const handleViewScript = (script: Script) => {
    setEditingScript(script);
    setIsEditorOpen(true);
  };

  const handleCancelExecution = async (execution: any) => {
    if (window.confirm('Tem certeza que deseja cancelar esta execução?')) {
      await cancelExecution(execution.id);
    }
  };

  const handleExecutionStart = (executionId: string) => {
    console.log('Execução iniciada:', executionId);
    // Aqui você pode adicionar lógica adicional quando uma execução é iniciada
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
        return 'Visão geral da plataforma de automação';
      case 'scripts':
        return 'Gerencie e execute seus scripts Playwright';
      case 'executions':
        return 'Monitore execuções em andamento e históricas';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExecutionChart />
              <RecentExecutions executions={executions} />
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
                <div className="text-blue-600">[INFO] Playwright service inicializado</div>
                <div className="text-green-600">[INFO] WebSocket connection estabelecida</div>
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
                Configurações do Playwright
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Navegador Padrão
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700">
                      <option value="chromium">Chromium</option>
                      <option value="firefox">Firefox</option>
                      <option value="webkit">WebKit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timeout Padrão (ms)
                    </label>
                    <input
                      type="number"
                      defaultValue={30000}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Modo Headless</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Capturar Screenshots</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Gravar Vídeo</span>
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
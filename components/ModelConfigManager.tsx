import React, { useState, useEffect } from 'react';
import { AiModel, AiRole, ApiChannel, ModelConfigManager } from '../constants';
import { testApiChannel } from '../services/apiTestService';
import { 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Download, 
  Upload, 
  RefreshCw,
  Bot,
  Brain,
  Image,
  Zap,
  AlertCircle,
  Check,
  HardDrive,
  Globe,
  Key,
  Eye,
  EyeOff,
  Star,
  StarOff
} from 'lucide-react';

interface ModelConfigManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange: () => void;
}

interface EditingChannel extends Partial<ApiChannel> {
  isNew?: boolean;
}

interface EditingModel extends Partial<AiModel> {
  isNew?: boolean;
}

interface EditingRole extends Partial<AiRole> {
  isNew?: boolean;
}

const ModelConfigManagerComponent: React.FC<ModelConfigManagerProps> = ({ 
  isOpen, 
  onClose, 
  onConfigChange 
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'models' | 'roles' | 'storage'>('channels');
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [roles, setRoles] = useState<AiRole[]>([]);
  const [editingChannel, setEditingChannel] = useState<EditingChannel | null>(null);
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null);
  const [editingRole, setEditingRole] = useState<EditingRole | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ used: number; available: number; channels: number; models: number; roles: number }>({ used: 0, available: 0, channels: 0, models: 0, roles: 0 });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      updateStorageInfo();
    }
  }, [isOpen]);

  const loadConfig = () => {
    try {
      setChannels(ModelConfigManager.getChannels());
      setModels(ModelConfigManager.getModels());
      setRoles(ModelConfigManager.getRoles());
    } catch (error) {
      console.error('加载配置失败:', error);
      showMessage('error', '加载配置失败，请检查浏览器存储设置');
    }
  };

  const updateStorageInfo = () => {
    try {
      setStorageInfo(ModelConfigManager.getStorageInfo());
    } catch (error) {
      console.error('获取存储信息失败:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleApiKeyVisibility = (channelId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [channelId]: !prev[channelId]
    }));
  };

  // ============ 渠道管理 ============

  const handleSaveChannel = () => {
    if (!editingChannel) return;

    const errors = ModelConfigManager.validateChannel(editingChannel);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (editingChannel.isNew) {
        const { id, createdAt, isCustom, isNew, ...channelData } = editingChannel;
        ModelConfigManager.addChannel(channelData as Omit<ApiChannel, 'id' | 'createdAt' | 'isCustom'>);
        showMessage('success', '渠道添加成功');
      } else {
        ModelConfigManager.updateChannel(editingChannel.id!, editingChannel);
        showMessage('success', '渠道更新成功');
      }
      
      loadConfig();
      updateStorageInfo();
      setEditingChannel(null);
      setValidationErrors([]);
      onConfigChange();
    } catch (error) {
      showMessage('error', '保存渠道失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteChannel = (id: string) => {
    // 检查是否有模型使用此渠道
    const modelsUsingChannel = models.filter(model => model.channelId === id);
    if (modelsUsingChannel.length > 0) {
      showMessage('error', `无法删除渠道：有 ${modelsUsingChannel.length} 个模型正在使用此渠道`);
      return;
    }

    if (window.confirm('确定要删除这个渠道吗？此操作不可撤销。')) {
      try {
        ModelConfigManager.deleteChannel(id);
        loadConfig();
        updateStorageInfo();
        showMessage('success', '渠道删除成功');
        onConfigChange();
      } catch (error) {
        showMessage('error', '删除渠道失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  const handleSetDefaultChannel = (id: string) => {
    try {
      ModelConfigManager.updateChannel(id, { isDefault: true });
      loadConfig();
      showMessage('success', '默认渠道设置成功');
    } catch (error) {
      showMessage('error', '设置默认渠道失败');
    }
  };

  const handleTestChannel = async (channel: ApiChannel) => {
    try {
      const result = await testApiChannel(channel.baseUrl, channel.apiKey, channel.name);
      if (result.success) {
        showMessage('success', result.message);
      } else {
        showMessage('error', `测试失败: ${result.message}`);
      }
    } catch (error) {
      showMessage('error', '测试失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // ============ 模型管理 ============

  const handleSaveModel = () => {
    if (!editingModel) return;

    const errors = ModelConfigManager.validateModel(editingModel);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      if (editingModel.isNew) {
        const { id, createdAt, isCustom, isNew, ...modelData } = editingModel;
        ModelConfigManager.addModel(modelData as Omit<AiModel, 'id' | 'createdAt' | 'isCustom'>);
        showMessage('success', '模型添加成功');
      } else {
        ModelConfigManager.updateModel(editingModel.id!, editingModel);
        showMessage('success', '模型更新成功');
      }
      
      loadConfig();
      updateStorageInfo();
      setEditingModel(null);
      setValidationErrors([]);
      onConfigChange();
    } catch (error) {
      showMessage('error', '保存模型失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteModel = (id: string) => {
    // 检查是否有角色使用此模型
    const rolesUsingModel = roles.filter(role => role.modelId === id);
    if (rolesUsingModel.length > 0) {
      showMessage('error', `无法删除模型：有 ${rolesUsingModel.length} 个角色正在使用此模型`);
      return;
    }

    if (window.confirm('确定要删除这个模型吗？此操作不可撤销。')) {
      try {
        ModelConfigManager.deleteModel(id);
        loadConfig();
        updateStorageInfo();
        showMessage('success', '模型删除成功');
        onConfigChange();
      } catch (error) {
        showMessage('error', '删除模型失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  // ============ 角色管理 ============

  const handleSaveRole = () => {
    if (!editingRole) return;

    if (!editingRole.name?.trim() || !editingRole.systemPrompt?.trim() || !editingRole.modelId) {
      setValidationErrors(['角色名称、系统提示词和关联模型都不能为空']);
      return;
    }

    try {
      if (editingRole.isNew) {
        const { id, isNew, ...roleData } = editingRole;
        ModelConfigManager.addRole(roleData as Omit<AiRole, 'id'>);
        showMessage('success', '角色添加成功');
      } else {
        ModelConfigManager.updateRole(editingRole.id!, editingRole);
        showMessage('success', '角色更新成功');
      }
      
      loadConfig();
      updateStorageInfo();
      setEditingRole(null);
      setValidationErrors([]);
      onConfigChange();
    } catch (error) {
      showMessage('error', '保存角色失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteRole = (id: string) => {
    if (window.confirm('确定要删除这个角色吗？此操作不可撤销。')) {
      try {
        ModelConfigManager.deleteRole(id);
        loadConfig();
        updateStorageInfo();
        showMessage('success', '角色删除成功');
        onConfigChange();
      } catch (error) {
        showMessage('error', '删除角色失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  // ============ 通用操作 ============

  const handleExport = () => {
    try {
      const config = ModelConfigManager.exportConfig();
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `multi-mind-chat-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', '配置导出成功');
    } catch (error) {
      showMessage('error', '导出配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleImport = () => {
    if (!importText.trim()) {
      showMessage('error', '请输入配置内容');
      return;
    }

    try {
      const result = ModelConfigManager.importConfig(importText);
      if (result.success) {
        loadConfig();
        updateStorageInfo();
        setImportText('');
        setShowImport(false);
        showMessage('success', result.message);
        onConfigChange();
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      showMessage('error', '导入配置时发生错误: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleReset = () => {
    if (window.confirm('确定要重置为默认配置吗？这将删除所有自定义配置。')) {
      try {
        ModelConfigManager.resetToDefaults();
        loadConfig();
        updateStorageInfo();
        showMessage('success', '已重置为默认配置');
        onConfigChange();
      } catch (error) {
        showMessage('error', '重置配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('警告：这将清空所有配置数据，包括渠道、模型和角色！此操作不可撤销，确定继续吗？')) {
      try {
        ModelConfigManager.clearAllData();
        loadConfig();
        updateStorageInfo();
        showMessage('success', '所有数据已清空');
        onConfigChange();
      } catch (error) {
        showMessage('error', '清空数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Settings size={24} className="text-sky-400" />
            <h2 className="text-xl font-semibold text-white">Multi-Mind Chat 配置管理</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center space-x-1"
              title="导出配置"
            >
              <Download size={16} />
              <span>导出</span>
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center space-x-1"
              title="导入配置"
            >
              <Upload size={16} />
              <span>导入</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm flex items-center space-x-1"
              title="重置为默认配置"
            >
              <RefreshCw size={16} />
              <span>重置</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-4 mt-2 p-2 rounded text-sm flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Import Section */}
        {showImport && (
          <div className="mx-4 mt-2 p-4 bg-gray-700 rounded">
            <h3 className="text-white mb-2">导入配置</h3>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-32 bg-gray-600 text-white p-2 rounded text-sm font-mono"
              placeholder="粘贴配置JSON内容..."
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setShowImport(false)}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                导入
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'channels'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Globe size={16} />
              <span>API渠道配置</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'models'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Brain size={16} />
              <span>AI模型配置</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Bot size={16} />
              <span>AI角色配置</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'storage'
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <HardDrive size={16} />
              <span>存储管理</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'channels' ? (
            <div className="h-full flex">
              {/* Channels List */}
              <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">API渠道列表</h3>
                    <button
                      onClick={() => setEditingChannel({ 
                        isNew: true, 
                        isDefault: false,
                        timeout: 30000,
                        baseUrl: 'https://api.openai.com/v1'
                      })}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>添加渠道</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {channels.map((channel) => (
                      <div key={channel.id} className="bg-gray-700 rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-white font-medium">{channel.name}</h4>
                              {channel.isDefault && (
                                <Star size={16} className="text-yellow-400" title="默认渠道" />
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{channel.baseUrl}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Key size={12} className="text-gray-500" />
                              <span className="text-gray-500 text-xs">
                                {showApiKeys[channel.id] 
                                  ? channel.apiKey || '未设置'
                                  : '••••••••••••••••••••••••••••••••••••••••'
                                }
                              </span>
                              <button
                                onClick={() => toggleApiKeyVisibility(channel.id)}
                                className="text-gray-500 hover:text-gray-300"
                              >
                                {showApiKeys[channel.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            </div>
                            {channel.description && (
                              <p className="text-gray-500 text-xs mt-1">{channel.description}</p>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            {!channel.isDefault && (
                              <button
                                onClick={() => handleSetDefaultChannel(channel.id)}
                                className="p-1 text-gray-400 hover:text-yellow-400"
                                title="设为默认"
                              >
                                <StarOff size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingChannel(channel)}
                              className="p-1 text-gray-400 hover:text-sky-400"
                              title="编辑"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleTestChannel(channel)}
                              className="p-1 text-gray-400 hover:text-green-400"
                              title="测试"
                            >
                              <RefreshCw size={16} />
                            </button>
                            {channel.isCustom && (
                              <button
                                onClick={() => handleDeleteChannel(channel.id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel Editor */}
              <div className="w-1/2 overflow-y-auto">
                {editingChannel ? (
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-white mb-4">
                      {editingChannel.isNew ? '添加新渠道' : '编辑渠道'}
                    </h3>
                    
                    {validationErrors.length > 0 && (
                      <div className="mb-4 p-3 bg-red-600 rounded">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle size={16} className="text-white" />
                          <span className="text-white font-medium">配置错误</span>
                        </div>
                        {validationErrors.map((error, index) => (
                          <p key={index} className="text-white text-sm">{error}</p>
                        ))}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">渠道名称</label>
                        <input
                          type="text"
                          value={editingChannel.name || ''}
                          onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          placeholder="例如: OpenAI 官方"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">API基础URL</label>
                        <input
                          type="text"
                          value={editingChannel.baseUrl || ''}
                          onChange={(e) => setEditingChannel({ ...editingChannel, baseUrl: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">API密钥</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={editingChannel.apiKey || ''}
                            onChange={(e) => setEditingChannel({ ...editingChannel, apiKey: e.target.value })}
                            className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                            placeholder="输入API密钥"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">描述（可选）</label>
                        <textarea
                          value={editingChannel.description || ''}
                          onChange={(e) => setEditingChannel({ ...editingChannel, description: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm h-20"
                          placeholder="渠道用途描述..."
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">超时时间（毫秒）</label>
                        <input
                          type="number"
                          value={editingChannel.timeout || 30000}
                          onChange={(e) => setEditingChannel({ ...editingChannel, timeout: parseInt(e.target.value) || 30000 })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          min="1000"
                          max="120000"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingChannel.isDefault || false}
                            onChange={(e) => setEditingChannel({ ...editingChannel, isDefault: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-gray-300 text-sm">设为默认渠道</span>
                        </label>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <button
                          onClick={() => {
                            setEditingChannel(null);
                            setValidationErrors([]);
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveChannel}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Save size={16} />
                          <span>保存</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 h-full flex items-center justify-center">
                    <p className="text-gray-400">选择一个渠道进行编辑，或添加新渠道</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'models' ? (
            <div className="h-full flex">
              {/* Models List */}
              <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">模型列表</h3>
                    <button
                      onClick={() => setEditingModel({ 
                        isNew: true, 
                        supportsImages: true, 
                        supportsReducedCapacity: true,
                        category: 'GPT-4系列',
                        maxTokens: 4096,
                        temperature: 0.7,
                        channelId: channels.length > 0 ? channels[0].id : ''
                      })}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>添加模型</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {models.map((model) => {
                      const channel = channels.find(ch => ch.id === model.channelId);
                      return (
                        <div key={model.id} className="bg-gray-700 rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-medium">{model.name}</h4>
                              <p className="text-gray-400 text-sm">{model.apiName}</p>
                              <p className="text-gray-500 text-xs">{model.category}</p>
                              <p className="text-gray-500 text-xs">
                                渠道: {channel?.name || '未找到渠道'}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingModel(model)}
                                className="p-1 text-gray-400 hover:text-sky-400"
                                title="编辑"
                              >
                                <Edit3 size={16} />
                              </button>
                              {model.isCustom && (
                                <button
                                  onClick={() => handleDeleteModel(model.id)}
                                  className="p-1 text-gray-400 hover:text-red-400"
                                  title="删除"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {model.supportsImages && (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded flex items-center space-x-1">
                                <Image size={12} />
                                <span>图像</span>
                              </span>
                            )}
                            {model.supportsReducedCapacity && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center space-x-1">
                                <Zap size={12} />
                                <span>优化</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Model Editor */}
              <div className="w-1/2 overflow-y-auto">
                {editingModel ? (
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-white mb-4">
                      {editingModel.isNew ? '添加新模型' : '编辑模型'}
                    </h3>
                    
                    {validationErrors.length > 0 && (
                      <div className="mb-4 p-3 bg-red-600 rounded">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle size={16} className="text-white" />
                          <span className="text-white font-medium">配置错误</span>
                        </div>
                        {validationErrors.map((error, index) => (
                          <p key={index} className="text-white text-sm">{error}</p>
                        ))}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">显示名称</label>
                        <input
                          type="text"
                          value={editingModel.name || ''}
                          onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          placeholder="例如: GPT-4 Turbo"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">API模型名称</label>
                        <input
                          type="text"
                          value={editingModel.apiName || ''}
                          onChange={(e) => setEditingModel({ ...editingModel, apiName: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          placeholder="例如: gpt-4-turbo"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">API渠道</label>
                        <select
                          value={editingModel.channelId || ''}
                          onChange={(e) => setEditingModel({ ...editingModel, channelId: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                        >
                          <option value="">选择渠道</option>
                          {channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">模型类别</label>
                        <input
                          type="text"
                          value={editingModel.category || ''}
                          onChange={(e) => setEditingModel({ ...editingModel, category: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          placeholder="例如: GPT-4系列"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 text-sm mb-1">最大Token数</label>
                          <input
                            type="number"
                            value={editingModel.maxTokens || 4096}
                            onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) || 4096 })}
                            className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                            min="1"
                            max="32768"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-1">默认温度</label>
                          <input
                            type="number"
                            value={editingModel.temperature || 0.7}
                            onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) || 0.7 })}
                            className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                            min="0"
                            max="2"
                            step="0.1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingModel.supportsImages || false}
                            onChange={(e) => setEditingModel({ ...editingModel, supportsImages: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-gray-300 text-sm">支持图像处理</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingModel.supportsReducedCapacity || false}
                            onChange={(e) => setEditingModel({ ...editingModel, supportsReducedCapacity: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-gray-300 text-sm">支持性能优化模式</span>
                        </label>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <button
                          onClick={() => {
                            setEditingModel(null);
                            setValidationErrors([]);
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveModel}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Save size={16} />
                          <span>保存</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 h-full flex items-center justify-center">
                    <p className="text-gray-400">选择一个模型进行编辑，或添加新模型</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'roles' ? (
            <div className="h-full flex">
              {/* Roles List */}
              <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">角色列表</h3>
                    <button
                      onClick={() => setEditingRole({ 
                        isNew: true, 
                        isActive: true,
                        modelId: models.length > 0 ? models[0].id : ''
                      })}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>添加角色</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {roles.map((role) => {
                      const associatedModel = models.find(m => m.id === role.modelId);
                      const associatedChannel = associatedModel ? channels.find(ch => ch.id === associatedModel.channelId) : null;
                      return (
                        <div key={role.id} className="bg-gray-700 rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-medium flex items-center space-x-2">
                                <span>{role.name}</span>
                                {role.isActive && (
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">活跃</span>
                                )}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                模型: {associatedModel?.name || '未找到模型'}
                              </p>
                              <p className="text-gray-500 text-xs">
                                渠道: {associatedChannel?.name || '未找到渠道'}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingRole(role)}
                                className="p-1 text-gray-400 hover:text-sky-400"
                                title="编辑"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-500 text-xs line-clamp-2">
                            {role.systemPrompt}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Role Editor */}
              <div className="w-1/2 overflow-y-auto">
                {editingRole ? (
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-white mb-4">
                      {editingRole.isNew ? '添加新角色' : '编辑角色'}
                    </h3>
                    
                    {validationErrors.length > 0 && (
                      <div className="mb-4 p-3 bg-red-600 rounded">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle size={16} className="text-white" />
                          <span className="text-white font-medium">配置错误</span>
                        </div>
                        {validationErrors.map((error, index) => (
                          <p key={index} className="text-white text-sm">{error}</p>
                        ))}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">角色名称</label>
                        <input
                          type="text"
                          value={editingRole.name || ''}
                          onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                          placeholder="例如: 分析师"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">关联模型</label>
                        <select
                          value={editingRole.modelId || ''}
                          onChange={(e) => setEditingRole({ ...editingRole, modelId: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm"
                        >
                          <option value="">选择模型</option>
                          {models.map((model) => {
                            const channel = channels.find(ch => ch.id === model.channelId);
                            return (
                              <option key={model.id} value={model.id}>
                                {model.name} ({channel?.name || '未知渠道'})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-300 text-sm mb-1">系统提示词</label>
                        <textarea
                          value={editingRole.systemPrompt || ''}
                          onChange={(e) => setEditingRole({ ...editingRole, systemPrompt: e.target.value })}
                          className="w-full bg-gray-700 text-white p-2 rounded text-sm h-32"
                          placeholder="定义AI角色的行为和特性..."
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingRole.isActive || false}
                            onChange={(e) => setEditingRole({ ...editingRole, isActive: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-gray-300 text-sm">激活此角色</span>
                        </label>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <button
                          onClick={() => {
                            setEditingRole(null);
                            setValidationErrors([]);
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveRole}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Save size={16} />
                          <span>保存</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 h-full flex items-center justify-center">
                    <p className="text-gray-400">选择一个角色进行编辑，或添加新角色</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Storage Management Tab
            <div className="p-6">
              <h3 className="text-lg font-medium text-white mb-6">存储管理</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">存储使用情况</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">已使用:</span>
                      <span className="text-white">{(storageInfo.used / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">可用:</span>
                      <span className="text-white">{(storageInfo.available / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-sky-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min((storageInfo.used / (storageInfo.used + storageInfo.available)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">配置统计</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">API渠道:</span>
                      <span className="text-white">{storageInfo.channels}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">模型数量:</span>
                      <span className="text-white">{storageInfo.models}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">角色数量:</span>
                      <span className="text-white">{storageInfo.roles}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">数据管理</h4>
                <div className="space-y-3">
                  <p className="text-gray-300 text-sm">
                    所有配置数据存储在浏览器的localStorage中。清除浏览器数据可能会导致配置丢失。建议定期导出配置进行备份。
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
                    >
                      重置为默认配置
                    </button>
                    <button
                      onClick={handleClearAllData}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      清空所有数据
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelConfigManagerComponent;
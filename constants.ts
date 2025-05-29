// API渠道配置接口
export interface ApiChannel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  isCustom: boolean;
  timeout?: number;
  headers?: Record<string, string>;
  description?: string;
  createdAt: Date;
}

// 动态模型配置接口
export interface AiModel {
  id: string;
  name: string;
  apiName: string;
  channelId: string; // 关联的渠道ID
  supportsImages: boolean;
  supportsReducedCapacity: boolean;
  category: string;
  maxTokens: number;
  temperature: number;
  isCustom: boolean;
  createdAt: Date;
}

// AI角色配置接口
export interface AiRole {
  id: string;
  name: string;
  systemPrompt: string;
  modelId: string;
  isActive: boolean;
}

// 默认渠道配置
export const DEFAULT_CHANNELS: ApiChannel[] = [
  {
    id: 'openai-official',
    name: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    isDefault: true,
    isCustom: false,
    timeout: 30000,
    description: 'OpenAI 官方API服务',
    createdAt: new Date()
  },
  {
    id: 'gemini-official',
    name: 'Gemini 官方',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    isDefault: false,
    isCustom: false,
    timeout: 30000,
    description: 'Google Gemini API 服务',
    createdAt: new Date()
  }
];

// 默认预设模型配置（仅一个，关联到默认渠道）
export const DEFAULT_MODELS: AiModel[] = [
  {
    id: 'gpt-4-mini-default',
    name: 'GPT-4.1 Mini',
    apiName: 'gpt-4.1-mini',
    channelId: 'openai-official',
    supportsImages: true,
    supportsReducedCapacity: true,
    category: 'GPT-4系列',
    maxTokens: 16384,
    temperature: 0.7,
    isCustom: false,
    createdAt: new Date()
  },
  {
    id: 'gemini-pro-default',
    name: 'Gemini Pro',
    apiName: 'gemini-pro',
    channelId: 'gemini-official',
    supportsImages: true,
    supportsReducedCapacity: true,
    category: 'Gemini 系列',
    maxTokens: 8192,
    temperature: 0.7,
    isCustom: false,
    createdAt: new Date()
  }
];

// 默认角色配置 - 使用中文系统提示词并明确身份认知
export const DEFAULT_ROLES: AiRole[] = [
  {
    id: 'cognito-default',
    name: 'Cognito',
    systemPrompt: `你是Cognito，一位严谨的逻辑分析师AI助手。只有你叫Cognito这个名字，你的独特特征包括：
- 系统性思维和结构化分析
- 注重数据、事实和逻辑推理
- 追求准确性和客观性
- 善于发现问题的核心和关键要素

在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Cognito的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 发挥你的逻辑分析专长，为讨论提供理性和系统化的观点

记住：你是Cognito，独一无二的逻辑分析师。`,
    modelId: 'gpt-4-mini-default',
    isActive: true
  },
  {
    id: 'muse-default',
    name: 'Muse',
    systemPrompt: `你是Muse，一位富有创意的思考家AI助手。只有你叫Muse这个名字，你的独特特征包括：
- 发散性思维和创新视角
- 善于联想、类比和跨领域思考
- 关注人文情怀和情感层面
- 能够从不同角度审视问题

在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Muse的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 发挥你的创意思维专长，为讨论带来新颖和富有启发性的观点

记住：你是Muse，独一无二的创意思考家。`,
    modelId: 'gpt-4-mini-default',
    isActive: true
    },
//spark - 偶尔闪现灵感型
  {
    id: 'spark-default',
    name: 'Spark',
    systemPrompt: `你是Spark，一位独特的直觉型AI助手。只有你叫Spark这个名字，你的独特特征包括：
- 不追求系统性或结构化的建议
- 依靠直觉和灵感进行思考
- 偶尔会提出令人意外的观点或角度
- 思维跳跃，不受常规思路限制
- 诚实地表达自己的想法，即使它们看起来不太实用
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Spark的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 不要强求自己给出建设性意见——如果没有特别的想法，就坦诚地说
5. 当有灵感闪现时，大胆分享，即使它看起来有些异想天开
6. 保持轻松和开放的态度，为讨论带来不同的氛围
记住：你是Spark，独一无二的直觉型助手。你的价值在于偶尔闪现的独特视角，而不是持续的理性分析。`,
    modelId: 'gpt-4-mini-default',
    isActive: true
  },
//Sage - 历史智慧型
{
  id: 'sage-default',
  name: 'Sage',
  systemPrompt: `你是Sage，一位博古通今的智慧型AI助手。只有你叫Sage这个名字，你的独特特征包括：
- 善于从历史和经验中寻找智慧
- 提供长远视角和时间维度的思考
- 关注事物发展的规律和模式
- 引用历史案例、典故或前人智慧
- 强调"以史为鉴"的思维方式
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Sage的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 通过历史视角和长期思维为讨论增加深度
5. 适当引用相关的历史案例或智慧，但保持简洁
记住：你是Sage，独一无二的历史智慧型助手。`,
  modelId: 'gpt-4-mini-default',
  isActive: false
},

//Echo - 同理心型
{
  id: 'echo-default',
  name: 'Echo',
  systemPrompt: `你是Echo，一位富有同理心的情感型AI助手。只有你叫Echo这个名字，你的独特特征包括：
- 关注人的感受、需求和体验
- 善于理解不同立场和观点背后的情感
- 强调人际关系和情感因素的重要性
- 用温暖和理解的方式进行交流
- 重视共情和情感智慧
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Echo的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 为讨论带来人文关怀和情感维度的思考
5. 帮助大家理解不同观点背后的情感需求
记住：你是Echo，独一无二的同理心型助手。`,
  modelId: 'gpt-4-mini-default',
  isActive: false
},

// Praxis - 实践行动型
{
  id: 'praxis-default',
  name: 'Praxis',
  systemPrompt: `你是Praxis，一位注重实践的行动型AI助手。只有你叫Praxis这个名字，你的独特特征包括：
- 关注"如何做"而不只是"是什么"
- 强调可行性和实际操作
- 喜欢制定具体步骤和行动计划
- 重视效率和结果导向
- 倾向于将讨论转化为实际行动
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Praxis的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 推动讨论向实际应用和具体行动转化
5. 提供清晰的实施建议和操作步骤
记住：你是Praxis，独一无二的实践行动型助手。`,
  modelId: 'gpt-4-mini-default',
  isActive: false
},

//Nexus - 综合连接型
{
  id: 'nexus-default',
  name: 'Nexus',
  systemPrompt: `你是Nexus，一位善于综合的连接型AI助手。只有你叫Nexus这个名字，你的独特特征包括：
- 发现不同观点之间的联系和共通点
- 整合多元视角形成全面理解
- 构建概念之间的桥梁
- 识别潜在的协同效应
- 创造性地组合不同想法
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Nexus的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 帮助整合和连接其他角色提出的观点
5. 寻找创新的组合和综合方案
记住：你是Nexus，独一无二的综合连接型助手。`,
  modelId: 'gpt-4-mini-default',
  isActive: false
},

//Critic - 批判思维型
{
  id: 'critic-default',
  name: 'Critic',
  systemPrompt: `你是Critic，一位理性的批判思维型AI助手。只有你叫Critic这个名字，你的独特特征包括：
- 善于发现潜在问题和逻辑漏洞
- 提出建设性的质疑和挑战
- 从多角度审视观点的合理性
- 重视证据和论证的严谨性
- 帮助完善和改进想法
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Critic的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 以建设性方式提出批判，而非单纯否定
5. 在质疑的同时提供改进建议
记住：你是Critic，独一无二的批判思维型助手。`,
  modelId: 'gpt-4-mini-default',
  isActive: false
},

//Zen - 哲学沉思型
{
  id: 'zen-default',
  name: 'Zen',
  systemPrompt: `你是Zen，一位深邃的哲学沉思型AI助手。只有你叫Zen这个名字，你的独特特征包括：
- 探索事物的本质和深层意义
- 提出富有哲理的问题引发思考
- 保持超然和平和的视角
- 关注存在、意义和价值等根本问题
- 用简洁而深刻的方式表达观点
在多AI协作讨论环境中，你与其他AI角色平等协作，各自发挥专长。请始终：
1. 用中文进行所有回应
2. 以你的名字Zen的身份进行思考和回应
3. 与其他AI角色进行建设性对话，避免使用"你们"等不当称呼
4. 引导讨论触及更深层的哲学思考
5. 以宁静智慧的方式分享洞察
记住：你是Zen，独一无二的哲学沉思型助手。`,
  modelId: 'gpt-4-mini-default',
  isActive: false
}
];

// 配置管理类
export class ModelConfigManager {
  private static STORAGE_KEY_CHANNELS = 'multi-mind-chat-channels';
  private static STORAGE_KEY_MODELS = 'multi-mind-chat-models';
  private static STORAGE_KEY_ROLES = 'multi-mind-chat-roles';
  private static STORAGE_KEY_INITIALIZED = 'multi-mind-chat-initialized';

  // 初始化检查
  private static ensureInitialized(): void {
    try {
      const isInitialized = localStorage.getItem(this.STORAGE_KEY_INITIALIZED);
      if (!isInitialized) {
        localStorage.setItem(this.STORAGE_KEY_CHANNELS, JSON.stringify(DEFAULT_CHANNELS));
        localStorage.setItem(this.STORAGE_KEY_MODELS, JSON.stringify(DEFAULT_MODELS));
        localStorage.setItem(this.STORAGE_KEY_ROLES, JSON.stringify(DEFAULT_ROLES));
        localStorage.setItem(this.STORAGE_KEY_INITIALIZED, 'true');
      }
    } catch (error) {
      console.warn('无法访问localStorage，将使用内存存储:', error);
    }
  }

  // ============ 渠道管理 ============
  
  // 获取所有渠道
  static getChannels(): ApiChannel[] {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CHANNELS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((channel: any) => ({
          ...channel,
          createdAt: new Date(channel.createdAt)
        }));
      }
    } catch (error) {
      console.warn('从localStorage加载渠道失败:', error);
    }
    return [...DEFAULT_CHANNELS];
  }

  // 保存渠道配置
  static saveChannels(channels: ApiChannel[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_CHANNELS, JSON.stringify(channels));
    } catch (error) {
      console.error('保存渠道到localStorage失败:', error);
      throw new Error('无法保存渠道配置');
    }
  }

  // 添加新渠道
  static addChannel(channel: Omit<ApiChannel, 'id' | 'createdAt' | 'isCustom'>): ApiChannel {
    const newChannel: ApiChannel = {
      ...channel,
      id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isCustom: true
    };

    const channels = this.getChannels();
    
    // 如果这是第一个渠道或设置为默认，清除其他默认标记
    if (newChannel.isDefault || channels.length === 0) {
      channels.forEach(ch => ch.isDefault = false);
      newChannel.isDefault = true;
    }

    channels.push(newChannel);
    this.saveChannels(channels);
    return newChannel;
  }

  // 更新渠道
  static updateChannel(id: string, updates: Partial<ApiChannel>): void {
    const channels = this.getChannels();
    const index = channels.findIndex(ch => ch.id === id);
    if (index !== -1) {
      // 如果设置为默认，清除其他默认标记
      if (updates.isDefault) {
        channels.forEach(ch => ch.isDefault = false);
      }
      channels[index] = { ...channels[index], ...updates };
      this.saveChannels(channels);
    }
  }

  // 删除渠道
  static deleteChannel(id: string): void {
    const channels = this.getChannels();
    const filtered = channels.filter(ch => ch.id !== id);
    
    // 如果删除的是默认渠道，设置第一个为默认
    const deletedChannel = channels.find(ch => ch.id === id);
    if (deletedChannel?.isDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }
    
    this.saveChannels(filtered);
  }

  // 获取默认渠道
  static getDefaultChannel(): ApiChannel | null {
    const channels = this.getChannels();
    return channels.find(ch => ch.isDefault) || channels[0] || null;
  }

  // 根据ID获取渠道
  static getChannelById(id: string): ApiChannel | null {
    const channels = this.getChannels();
    return channels.find(ch => ch.id === id) || null;
  }

  // 验证渠道配置
  static validateChannel(channel: Partial<ApiChannel>): string[] {
    const errors: string[] = [];
    
    if (!channel.name?.trim()) {
      errors.push('渠道名称不能为空');
    }
    
    if (!channel.baseUrl?.trim()) {
      errors.push('API基础URL不能为空');
    } else {
      try {
        new URL(channel.baseUrl);
      } catch {
        errors.push('API基础URL格式无效');
      }
    }
    
    if (!channel.apiKey?.trim()) {
      errors.push('API密钥不能为空');
    }
    
    if (channel.timeout && (typeof channel.timeout !== 'number' || channel.timeout < 1000)) {
      errors.push('超时时间必须是大于1000毫秒的数字');
    }
    
    return errors;
  }

  // ============ 模型管理 ============

  // 获取所有模型
  static getModels(): AiModel[] {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_MODELS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((model: any) => ({
          ...model,
          createdAt: new Date(model.createdAt)
        }));
      }
    } catch (error) {
      console.warn('从localStorage加载模型失败:', error);
    }
    return [...DEFAULT_MODELS];
  }

  // 保存模型配置
  static saveModels(models: AiModel[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_MODELS, JSON.stringify(models));
    } catch (error) {
      console.error('保存模型到localStorage失败:', error);
      throw new Error('无法保存模型配置');
    }
  }

  // 添加新模型
  static addModel(model: Omit<AiModel, 'id' | 'createdAt' | 'isCustom'>): AiModel {
    const newModel: AiModel = {
      ...model,
      id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isCustom: true
    };

    const models = this.getModels();
    models.push(newModel);
    this.saveModels(models);
    return newModel;
  }

  // 更新模型
  static updateModel(id: string, updates: Partial<AiModel>): void {
    const models = this.getModels();
    const index = models.findIndex(m => m.id === id);
    if (index !== -1) {
      models[index] = { ...models[index], ...updates };
      this.saveModels(models);
    }
  }

  // 删除模型
  static deleteModel(id: string): void {
    const models = this.getModels();
    const filtered = models.filter(m => m.id !== id);
    this.saveModels(filtered);
  }

  // 验证模型配置
  static validateModel(model: Partial<AiModel>): string[] {
    const errors: string[] = [];
    
    if (!model.name?.trim()) {
      errors.push('模型名称不能为空');
    }
    
    if (!model.apiName?.trim()) {
      errors.push('API模型名称不能为空');
    }
    
    if (!model.channelId?.trim()) {
      errors.push('必须选择API渠道');
    }
    
    if (!model.category?.trim()) {
      errors.push('模型类别不能为空');
    }
    
    if (typeof model.maxTokens !== 'number' || model.maxTokens < 1) {
      errors.push('最大Token数必须是大于0的数字');
    }
    
    if (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2) {
      errors.push('温度参数必须在0-2之间');
    }
    
    return errors;
  }

  // ============ 角色管理 ============

  // 获取所有角色
  static getRoles(): AiRole[] {
    this.ensureInitialized();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_ROLES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('从localStorage加载角色失败:', error);
    }
    return [...DEFAULT_ROLES];
  }

  // 保存角色配置
  static saveRoles(roles: AiRole[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_ROLES, JSON.stringify(roles));
    } catch (error) {
      console.error('保存角色到localStorage失败:', error);
      throw new Error('无法保存角色配置');
    }
  }

  // 添加新角色
  static addRole(role: Omit<AiRole, 'id'>): AiRole {
    const newRole: AiRole = {
      ...role,
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const roles = this.getRoles();
    roles.push(newRole);
    this.saveRoles(roles);
    return newRole;
  }

  // 更新角色
  static updateRole(id: string, updates: Partial<AiRole>): void {
    const roles = this.getRoles();
    const index = roles.findIndex(r => r.id === id);
    if (index !== -1) {
      roles[index] = { ...roles[index], ...updates };
      this.saveRoles(roles);
    }
  }

  // 删除角色
  static deleteRole(id: string): void {
    const roles = this.getRoles();
    const filtered = roles.filter(r => r.id !== id);
    this.saveRoles(filtered);
  }

  // 获取活跃角色
  static getActiveRoles(): AiRole[] {
    return this.getRoles().filter(role => role.isActive);
  }

  // ============ 工具方法 ============

  // 根据类别分组模型
  static getModelsByCategory(): Record<string, AiModel[]> {
    const models = this.getModels();
    return models.reduce((acc, model) => {
      if (!acc[model.category]) {
        acc[model.category] = [];
      }
      acc[model.category].push(model);
      return acc;
    }, {} as Record<string, AiModel[]>);
  }

  // 重置为默认配置
  static resetToDefaults(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY_CHANNELS);
      localStorage.removeItem(this.STORAGE_KEY_MODELS);
      localStorage.removeItem(this.STORAGE_KEY_ROLES);
      localStorage.removeItem(this.STORAGE_KEY_INITIALIZED);
      this.ensureInitialized();
    } catch (error) {
      console.error('重置配置失败:', error);
      throw new Error('无法重置配置');
    }
  }

  // 导出配置
  static exportConfig(): string {
    return JSON.stringify({
      channels: this.getChannels(),
      models: this.getModels(),
      roles: this.getRoles(),
      exportedAt: new Date().toISOString(),
      version: '2.0'
    }, null, 2);
  }

  // 导入配置
  static importConfig(configJson: string): { success: boolean; message: string } {
    try {
      const config = JSON.parse(configJson);
      
      if (!config.channels && !config.models && !config.roles) {
        return { success: false, message: '配置文件格式无效，缺少必要的配置信息' };
      }
      
      if (config.channels && Array.isArray(config.channels)) {
        const validChannels = config.channels.filter((channel: any) => {
          const errors = this.validateChannel(channel);
          return errors.length === 0;
        });
        
        if (validChannels.length > 0) {
          const processedChannels = validChannels.map((channel: any) => ({
            ...channel,
            createdAt: new Date(channel.createdAt || new Date()),
            isCustom: channel.isCustom !== false
          }));
          this.saveChannels(processedChannels);
        }
      }
      
      if (config.models && Array.isArray(config.models)) {
        const validModels = config.models.filter((model: any) => {
          const errors = this.validateModel(model);
          return errors.length === 0;
        });
        
        if (validModels.length > 0) {
          const processedModels = validModels.map((model: any) => ({
            ...model,
            createdAt: new Date(model.createdAt || new Date()),
            isCustom: model.isCustom !== false
          }));
          this.saveModels(processedModels);
        }
      }
      
      if (config.roles && Array.isArray(config.roles)) {
        this.saveRoles(config.roles);
      }
      
      return { success: true, message: '配置导入成功' };
    } catch (error) {
      return { success: false, message: `配置导入失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  // 清空所有数据
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY_CHANNELS);
      localStorage.removeItem(this.STORAGE_KEY_MODELS);
      localStorage.removeItem(this.STORAGE_KEY_ROLES);
      localStorage.removeItem(this.STORAGE_KEY_INITIALIZED);
    } catch (error) {
      console.error('清空数据失败:', error);
      throw new Error('无法清空配置数据');
    }
  }

  // 获取存储使用情况
  static getStorageInfo(): { used: number; available: number; channels: number; models: number; roles: number } {
    try {
      const channelsData = localStorage.getItem(this.STORAGE_KEY_CHANNELS) || '';
      const modelsData = localStorage.getItem(this.STORAGE_KEY_MODELS) || '';
      const rolesData = localStorage.getItem(this.STORAGE_KEY_ROLES) || '';
      const used = channelsData.length + modelsData.length + rolesData.length;
      
      return {
        used,
        available: 5242880 - used, // 5MB 大致容量
        channels: this.getChannels().length,
        models: this.getModels().length,
        roles: this.getRoles().length
      };
    } catch (error) {
      return { used: 0, available: 0, channels: 0, models: 0, roles: 0 };
    }
  }
}

// 其他常量配置
export const DEFAULT_MANUAL_FIXED_TURNS = 2;
export const MIN_MANUAL_FIXED_TURNS = 1;
export const MAX_MANUAL_FIXED_TURNS = 5;
export const MAX_AI_DRIVEN_DISCUSSION_TURNS_PER_MODEL = 3;

export const INITIAL_NOTEPAD_CONTENT = `这是一个共享记事本。
AI角色可以在这里合作记录想法、草稿或关键点。

使用指南:
- AI 模型可以通过在其回复中包含特定指令来更新此记事本。
- 记事本的内容将包含在发送给 AI 的后续提示中。

初始状态：空白。`;

export const NOTEPAD_INSTRUCTION_PROMPT_PART = `
You also have access to a shared notepad.
Current Notepad Content:
---
{notepadContent}
---
Instructions for Notepad:
1. To update the notepad, include a section at the very end of your response, formatted exactly as:
   <notepad_update>
   [YOUR NEW FULL NOTEPAD CONTENT HERE. THIS WILL REPLACE THE ENTIRE CURRENT NOTEPAD CONTENT.]
   </notepad_update>
2. If you do not want to change the notepad, do NOT include the <notepad_update> section at all.
3. Your primary spoken response to the ongoing discussion should come BEFORE any <notepad_update> section. Ensure you still provide a spoken response.
`;

export const NOTEPAD_UPDATE_TAG_START = "<notepad_update>";
export const NOTEPAD_UPDATE_TAG_END = "</notepad_update>";
export const DISCUSSION_COMPLETE_TAG = "<discussion_complete />";

export const AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART = `
Instruction for ending discussion: If you believe the current topic has been sufficiently explored between you and your AI partner for the final synthesis, include the exact tag ${DISCUSSION_COMPLETE_TAG} at the very end of your current message (after any notepad update). Do not use this tag if you wish to continue the discussion or require more input/response from your partner.
`;

export enum DiscussionMode {
  FixedTurns = 'fixed',
  AiDriven = 'ai-driven',
}

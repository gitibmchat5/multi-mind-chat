import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, MessageSender, MessagePurpose } from './types';
import { generateResponse } from './services/aiService';
import ChatInput from './components/ChatInput';
import MessageBubble from './components/MessageBubble';
import Notepad from './components/Notepad';
import ModelConfigManager from './components/ModelConfigManager';
import {
  AiModel,
  AiRole,
  ApiChannel,
  ModelConfigManager as ConfigManager,
  DEFAULT_MANUAL_FIXED_TURNS,
  MIN_MANUAL_FIXED_TURNS,
  MAX_MANUAL_FIXED_TURNS,
  MAX_AI_DRIVEN_DISCUSSION_TURNS_PER_MODEL,
  INITIAL_NOTEPAD_CONTENT,
  NOTEPAD_INSTRUCTION_PROMPT_PART,
  NOTEPAD_UPDATE_TAG_START,
  NOTEPAD_UPDATE_TAG_END,
  DISCUSSION_COMPLETE_TAG,
  AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART,
  DiscussionMode
} from './constants';
import { 
  BotMessageSquare, 
  AlertTriangle, 
  RefreshCcw, 
  SlidersHorizontal, 
  Users, 
  MessagesSquare, 
  Bot, 
  ChevronDown,
  Settings,
  Play,
  Pause,
  Square,
  Download
} from 'lucide-react';

interface ParsedAIResponse {
  spokenText: string;
  newNotepadContent: string | null;
  discussionShouldEnd?: boolean;
}

interface ActiveRole extends AiRole {
  model: AiModel;
  channel: ApiChannel;
  isProcessing?: boolean;
}

interface DiscussionState {
  currentRoleIndex: number;
  currentTurn: number;
  discussionLog: string[];
  isFirstMessage: boolean;
  previousAISignaledStop: boolean;
  discussionEndCount: number;
  userQuery: string;
  imageApiPart?: any;
  commonPromptInstructions: string;
  roleOrder: ActiveRole[];
  maxTurnsForLoop: number;
}

const parseAIResponse = (responseText: string): ParsedAIResponse => {
  let currentText = responseText.trim();
  let spokenText = "";
  let newNotepadContent: string | null = null;
  let discussionShouldEnd = false;
  
  let notepadActionText = "";
  let discussionActionText = "";

  const notepadStartIndex = currentText.lastIndexOf(NOTEPAD_UPDATE_TAG_START);
  const notepadEndIndex = currentText.lastIndexOf(NOTEPAD_UPDATE_TAG_END);

  if (notepadStartIndex !== -1 && notepadEndIndex !== -1 && notepadEndIndex > notepadStartIndex && currentText.endsWith(NOTEPAD_UPDATE_TAG_END)) {
    newNotepadContent = currentText.substring(notepadStartIndex + NOTEPAD_UPDATE_TAG_START.length, notepadEndIndex).trim();
    spokenText = currentText.substring(0, notepadStartIndex).trim(); 
    
    if (newNotepadContent) {
        notepadActionText = "更新了记事本";
    } else {
        notepadActionText = "尝试更新记事本但内容为空";
    }
  } else {
    spokenText = currentText;
  }

  if (spokenText.includes(DISCUSSION_COMPLETE_TAG)) {
    discussionShouldEnd = true;
    spokenText = spokenText.replace(new RegExp(DISCUSSION_COMPLETE_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "").trim();
    discussionActionText = "建议结束讨论";
  }

  if (!spokenText.trim()) {
    if (notepadActionText && discussionActionText) {
      spokenText = `(AI ${notepadActionText}并${discussionActionText})`;
    } else if (notepadActionText) {
      spokenText = `(AI ${notepadActionText})`;
    } else if (discussionActionText) {
      spokenText = `(AI ${discussionActionText})`;
    } else {
      spokenText = "(AI 未提供额外文本回复)"; 
    }
  }
  
  return { spokenText: spokenText.trim(), newNotepadContent, discussionShouldEnd };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const createDynamicMessageSender = (roleName: string): MessageSender => {
  return roleName as MessageSender;
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTotalProcessingTimeMs, setCurrentTotalProcessingTimeMs] = useState<number>(0);

  const [notepadContent, setNotepadContent] = useState<string>(INITIAL_NOTEPAD_CONTENT);
  const [lastNotepadUpdateBy, setLastNotepadUpdateBy] = useState<MessageSender | null>(null);

  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>(DiscussionMode.FixedTurns);
  const [manualFixedTurns, setManualFixedTurns] = useState<number>(DEFAULT_MANUAL_FIXED_TURNS);
  const [isReducedCapacityEnabled, setIsReducedCapacityEnabled] = useState<boolean>(false);

  const [activeRoles, setActiveRoles] = useState<ActiveRole[]>([]);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [isConfigManagerOpen, setIsConfigManagerOpen] = useState<boolean>(false);
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState<boolean>(false);

  const [isDiscussionActive, setIsDiscussionActive] = useState<boolean>(false);
  const [streamingMessages, setStreamingMessages] = useState<Map<string, { text: string; isComplete: boolean }>>(new Map());
  const [currentDiscussion, setCurrentDiscussion] = useState<DiscussionState | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentQueryStartTimeRef = useRef<number | null>(null);
  const cancelRequestRef = useRef<boolean>(false);

  // 实时流式消息管理
  const createStreamingMessage = (sender: MessageSender, purpose: MessagePurpose): string => {
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const message: ChatMessage = {
      id: messageId,
      text: '',
      sender,
      purpose,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setStreamingMessages(prev => new Map(prev.set(messageId, { text: '', isComplete: false })));
    return messageId;
  };

  const updateStreamingMessage = (messageId: string, fullText: string, isComplete: boolean, durationMs?: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { 
        ...msg, 
        text: fullText,
        durationMs: isComplete ? durationMs : msg.durationMs
      } : msg
    ));
  };

  const loadConfiguration = () => {
    const allChannels = ConfigManager.getChannels();
    const allModels = ConfigManager.getModels();
    const allRoles = ConfigManager.getActiveRoles();
    
    setChannels(allChannels);
    setModels(allModels);
    
    const rolesWithModelsAndChannels: ActiveRole[] = allRoles.map(role => {
      const model = allModels.find(m => m.id === role.modelId);
      if (!model) {
        console.warn(`Role ${role.name} references non-existent model ${role.modelId}`);
        return null;
      }
      
      const channel = allChannels.find(ch => ch.id === model.channelId);
      if (!channel) {
        console.warn(`Model ${model.name} references non-existent channel ${model.channelId}`);
        return null;
      }
      
      return { ...role, model, channel };
    }).filter(Boolean) as ActiveRole[];
    
    setActiveRoles(rolesWithModelsAndChannels);
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const addMessage = (
    text: string,
    sender: MessageSender,
    purpose: MessagePurpose,
    durationMs?: number,
    image?: ChatMessage['image']
  ) => {
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const message: ChatMessage = {
      id: messageId,
      text,
      sender,
      purpose,
      timestamp: new Date(),
      durationMs,
      image
    };

    setMessages(prev => [...prev, message]);
    return messageId;
  };

  const interruptDiscussion = () => {
    if (isLoading && isDiscussionActive) {
      cancelRequestRef.current = true;
      setIsLoading(false);
      setIsDiscussionActive(false);
      setCurrentDiscussion(null);
      
      if (currentTotalProcessingTimeMs > 0) {
        addMessage(
          `讨论已被用户中断 (已进行 ${(currentTotalProcessingTimeMs / 1000).toFixed(2)}秒)`,
          MessageSender.System,
          MessagePurpose.SystemNotification
        );
      }
      
      setCurrentTotalProcessingTimeMs(0);
      if (currentQueryStartTimeRef.current) {
        currentQueryStartTimeRef.current = null;
      }
    }
  };

  const exportDiscussionRecord = () => {
    if (messages.length === 0) {
      addMessage('当前没有可导出的消息记录', MessageSender.System, MessagePurpose.SystemNotification);
      return;
    }

    // 生成简洁的文本格式导出
    let exportText = `=== Multi-Mind Chat 对话记录 ===\n`;
    exportText += `导出时间: ${new Date().toLocaleString()}\n`;
    exportText += `消息总数: ${messages.length}\n\n`;

    messages.forEach(msg => {
      if (msg.purpose !== MessagePurpose.SystemNotification) {
        const timeStr = msg.timestamp.toLocaleTimeString();
        const durationStr = msg.durationMs ? ` (${(msg.durationMs / 1000).toFixed(2)}s)` : '';
        exportText += `[${timeStr}] ${msg.sender}${durationStr}: ${msg.text}\n\n`;
        
        if (msg.image) {
          exportText += `    [附件: ${msg.image.name} - ${msg.image.type}]\n\n`;
        }
      }
    });

    if (notepadContent !== INITIAL_NOTEPAD_CONTENT) {
      exportText += `=== 最终记事本内容 ===\n`;
      exportText += `${notepadContent}\n\n`;
    }

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对话记录-${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addMessage('对话记录已导出', MessageSender.System, MessagePurpose.SystemNotification);
  };

  const getWelcomeMessageText = () => {
    const modeDescription = discussionMode === DiscussionMode.FixedTurns 
      ? `固定轮次对话 (${manualFixedTurns}轮)` 
      : "AI驱动对话";
    
    const roleNames = activeRoles.map(role => role.name).join(' 和 ');
    const roleCount = activeRoles.length;
    const channelCount = channels.length;
    
    if (channelCount === 0) {
      return `欢迎使用Multi-Mind Chat 智囊团！请先配置API渠道。点击设置按钮开始配置。`;
    } else if (roleCount === 0) {
      return `欢迎使用Multi-Mind Chat 智囊团！已配置 ${channelCount} 个API渠道，请继续配置AI角色和模型。点击设置按钮开始配置。`;
    } else if (roleCount === 1) {
      return `欢迎使用Multi-Mind Chat 智囊团！当前模式: ${modeDescription}。当前只有一个活跃角色: ${roleNames}。建议添加更多角色以获得更好的协作体验。`;
    } else {
      return `欢迎使用Multi-Mind Chat 智囊团！当前模式: ${modeDescription}。活跃的AI角色: ${roleNames}。这些角色将协作讨论您的问题并使用共享记事本。`;
    }
  };
  
  const initializeChat = () => {
    setMessages([]);
    setNotepadContent(INITIAL_NOTEPAD_CONTENT);
    setLastNotepadUpdateBy(null);
    setIsDiscussionActive(false);
    setStreamingMessages(new Map());
    setCurrentDiscussion(null);

    addMessage(
      getWelcomeMessageText(),
      MessageSender.System,
      MessagePurpose.SystemNotification
    );
  };

  useEffect(() => {
    initializeChat();
  }, [activeRoles, discussionMode, manualFixedTurns, channels]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isLoading && currentQueryStartTimeRef.current) {
      intervalId = window.setInterval(() => {
        if (currentQueryStartTimeRef.current) {
          setCurrentTotalProcessingTimeMs(performance.now() - currentQueryStartTimeRef.current);
        }
      }, 100);
    } else {
      if (intervalId) clearInterval(intervalId);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading]);

  const handleClearChat = () => {
    if (isLoading) {
      cancelRequestRef.current = true;
    }
    setIsLoading(false);
    setIsDiscussionActive(false);
    setCurrentDiscussion(null);
    
    setCurrentTotalProcessingTimeMs(0);
    if (currentQueryStartTimeRef.current) {
        currentQueryStartTimeRef.current = null;
    }

    setMessages([]);
    setNotepadContent(INITIAL_NOTEPAD_CONTENT);
    setLastNotepadUpdateBy(null);
    setStreamingMessages(new Map());

    addMessage(
      getWelcomeMessageText(),
      MessageSender.System,
      MessagePurpose.SystemNotification
    );
  };
  
  const handleManualFixedTurnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      value = DEFAULT_MANUAL_FIXED_TURNS; 
    }
    value = Math.max(MIN_MANUAL_FIXED_TURNS, Math.min(MAX_MANUAL_FIXED_TURNS, value));
    setManualFixedTurns(value);
  };

  const toggleRoleActiveState = (roleId: string) => {
    const role = activeRoles.find(r => r.id === roleId);
    if (role) {
      ConfigManager.updateRole(roleId, { isActive: !role.isActive });
      loadConfiguration();
    }
  };

  const processNextRole = (state: DiscussionState) => {
    if (cancelRequestRef.current) {
      setIsDiscussionActive(false);
      setCurrentDiscussion(null);
      return;
    }

    // 检查是否完成所有讨论
    if (state.currentTurn === 0 && state.currentRoleIndex >= state.roleOrder.length) {
      // 第一轮结束，开始多轮讨论
      if (!state.previousAISignaledStop && state.maxTurnsForLoop > 0) {
        const newState = { ...state, currentTurn: 1, currentRoleIndex: 0, discussionEndCount: 0 };
        setCurrentDiscussion(newState);
        processNextRole(newState);
        return;
      } else {
        processFinalAnswer(state);
        return;
      }
    } else if (state.currentTurn > 0 && 
      (state.currentTurn >= state.maxTurnsForLoop || 
      state.previousAISignaledStop || 
      state.currentRoleIndex >= state.roleOrder.length)) {
      processFinalAnswer(state);
      return;
    }

    const currentRole = state.roleOrder[state.currentRoleIndex];
    const shouldUseReducedCapacity = isReducedCapacityEnabled && currentRole.model.supportsReducedCapacity;

    // 显示系统通知
    addMessage(
      `${currentRole.name} 正在${state.currentTurn === 0 ? '分析问题并提供观点' : '回应其他角色的观点'} (使用 ${currentRole.model.name} - ${currentRole.channel.name})...`, 
      MessageSender.System, 
      MessagePurpose.SystemNotification
    );

    // 立即创建消息气泡
    const purpose = state.currentRoleIndex % 2 === 0 ? MessagePurpose.CognitoToMuse : MessagePurpose.MuseToCognito;
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // 立即添加空消息到界面，用户会看到正在输入的效果
    const initialMessage: ChatMessage = {
      id: messageId,
      text: '', // 开始时为空，等待流式输入
      sender: createDynamicMessageSender(currentRole.name),
      purpose,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, initialMessage]);

    // 构建提示词
    let prompt: string;
    if (state.isFirstMessage) {
      prompt = `用户的查询 (中文) 是: "${state.userQuery}". ${state.imageApiPart ? "用户还提供了一张图片。请在您的分析和回复中同时考虑此图片和文本查询。" : ""} 请针对此查询提供您的初步想法或分析。这是一个多AI协作的环境，其他AI角色稍后会对您的观点进行回应和讨论。用中文回答。\n${state.commonPromptInstructions}`;
    } else if (state.currentTurn === 0) {
      const otherRoles = state.roleOrder.filter(r => r.id !== currentRole.id).map(r => r.name).join(' 和 ');
      prompt = `用户的查询 (中文) 是: "${state.userQuery}". ${state.imageApiPart ? "用户还提供了一张图片。请在您的分析和回复中同时考虑此图片和文本查询。" : ""} 当前讨论 (均为中文):\n${state.discussionLog.join("\n")}\n您正在与 ${otherRoles} 协作讨论这个问题。请提供您的观点和分析。用中文回答。\n${state.commonPromptInstructions}`;
    } else {
      const otherRoles = state.roleOrder.filter(r => r.id !== currentRole.id).map(r => r.name).join(' 和 ');
      prompt = `用户的查询 (中文) 是: "${state.userQuery}". ${state.imageApiPart ? "用户还提供了一张图片。请在您的分析和回复中同时考虑此图片和文本查询。" : ""} 当前讨论 (均为中文):\n${state.discussionLog.join("\n")}\n您正在与 ${otherRoles} 协作讨论。请对前面的讨论进行回应，提供您的进一步见解或不同观点。保持简洁并使用中文。\n${NOTEPAD_INSTRUCTION_PROMPT_PART.replace('{notepadContent}', notepadContent)}`;
      
      if (discussionMode === DiscussionMode.AiDriven && state.previousAISignaledStop) {
        prompt += `\n注意：之前有AI角色建议结束讨论。如果您同意，请在回复中包含 ${DISCUSSION_COMPLETE_TAG}。否则，请继续讨论。`;
      } else if (discussionMode === DiscussionMode.AiDriven) {
        prompt += AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART;
      }
    }

    // 用于后台累积完整响应文本的变量
    let accumulatedText = '';

    // 开始流式API调用
    generateResponse(
      prompt,
      currentRole.model.apiName,
      currentRole.systemPrompt,
      shouldUseReducedCapacity,
      state.imageApiPart,
      currentRole.channel.baseUrl,
      currentRole.channel.apiKey,
      // 关键的流式回调函数
      (newChunk: string, fullText: string, isComplete: boolean) => {
        // newChunk: 本次新接收到的文本块
        // fullText: API累积的完整文本（用于后续处理）
        // isComplete: 是否完成
        
        // 更新后台累积的完整文本
        accumulatedText = fullText;
        
        // 实时更新界面显示 - 关键是这里直接使用 fullText 进行显示
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            text: fullText, // 直接显示累积的完整文本，实现打字机效果
            durationMs: isComplete ? (performance.now() - (currentQueryStartTimeRef.current || 0)) : undefined
          } : msg
        ));
      }
    ).then(response => {
      if (cancelRequestRef.current) {
        setIsDiscussionActive(false);
        setCurrentDiscussion(null);
        return;
      }

      if (response.error) {
        if (response.error.includes("API key not valid") || response.error.includes("401")) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { 
              ...msg, 
              text: `API密钥无效 (渠道: ${currentRole.channel.name})，请在配置界面中检查密钥设置。`,
              durationMs: response.durationMs
            } : msg
          ));
          setIsLoading(false);
          setIsDiscussionActive(false);
          setCurrentDiscussion(null);
          return;
        }
        throw new Error(`${currentRole.name}: ${response.text}`);
      }

      // 确保最终消息内容正确
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { 
          ...msg, 
          text: response.text,
          durationMs: response.durationMs
        } : msg
      ));

      // 解析响应
      const parsedResponse = parseAIResponse(response.text);
      if (parsedResponse.newNotepadContent !== null) {
        setNotepadContent(parsedResponse.newNotepadContent);
        setLastNotepadUpdateBy(createDynamicMessageSender(currentRole.name));
      }

      // 更新讨论日志 - 使用解析后的文本
      const newDiscussionLog = [...state.discussionLog, `${currentRole.name}: ${parsedResponse.spokenText}`];
      
      // 更新状态
      let newState = {
        ...state,
        discussionLog: newDiscussionLog,
        isFirstMessage: false,
        currentRoleIndex: state.currentRoleIndex + 1
      };

      // 处理AI驱动模式的结束信号
      if (discussionMode === DiscussionMode.AiDriven && parsedResponse.discussionShouldEnd) {
        if (state.currentTurn > 0) {
          newState.discussionEndCount++;
          if (state.previousAISignaledStop || newState.discussionEndCount >= Math.ceil(state.roleOrder.length / 2)) {
            addMessage(`多数AI角色已同意结束讨论。`, MessageSender.System, MessagePurpose.SystemNotification);
            newState.previousAISignaledStop = true;
          } else {
            addMessage(`${currentRole.name} 已建议结束讨论。`, MessageSender.System, MessagePurpose.SystemNotification);
          }
        } else {
          newState.previousAISignaledStop = true;
          addMessage(`${currentRole.name} 已建议结束讨论。`, MessageSender.System, MessagePurpose.SystemNotification);
        }
      }

      setCurrentDiscussion(newState);
      
      // 继续处理下一个角色
      setTimeout(() => processNextRole(newState), 100);
    }).catch(error => {
      console.error("处理AI响应时出错:", error);
      addMessage(`错误: ${error instanceof Error ? error.message : "处理响应时发生未知错误"}`, MessageSender.System, MessagePurpose.SystemNotification);
      setIsLoading(false);
      setIsDiscussionActive(false);
      setCurrentDiscussion(null);
    });
  };

  const processFinalAnswer = (state: DiscussionState) => {
    const finalAnswerRole = state.roleOrder[0];
    const shouldUseReducedCapacity = isReducedCapacityEnabled && finalAnswerRole.model.supportsReducedCapacity;

    addMessage(
      `${finalAnswerRole.name} 正在综合所有讨论内容，准备最终答案 (使用 ${finalAnswerRole.model.name} - ${finalAnswerRole.channel.name})...`,
      MessageSender.System,
      MessagePurpose.SystemNotification
    );

    // 立即创建最终答案消息气泡
    const finalMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const finalMessage: ChatMessage = {
      id: finalMessageId,
      text: '', // 开始时为空
      sender: createDynamicMessageSender(finalAnswerRole.name),
      purpose: MessagePurpose.FinalResponse,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, finalMessage]);

    const finalPrompt = `用户最初的查询 (中文) 是: "${state.userQuery}". ${state.imageApiPart ? "用户还提供了一张图片。请在您的分析和回复中同时考虑此图片和文本查询。" : ""} 您和其他AI角色进行了以下讨论 (均为中文):\n${state.discussionLog.join("\n")}\n基于整个协作讨论过程和共享记事本的最终状态，请综合所有关键观点，为用户提供一个全面、有用的最终答案。直接回复用户，确保答案结构良好，易于理解，并使用中文。如果相关，您可以在答案中引用记事本内容。如果需要，您也可以最后一次更新记事本。\n${NOTEPAD_INSTRUCTION_PROMPT_PART.replace('{notepadContent}', notepadContent)}`;

    generateResponse(
      finalPrompt,
      finalAnswerRole.model.apiName,
      finalAnswerRole.systemPrompt,
      shouldUseReducedCapacity,
      state.imageApiPart,
      finalAnswerRole.channel.baseUrl,
      finalAnswerRole.channel.apiKey,
      // 最终答案的流式回调
      (newChunk: string, fullText: string, isComplete: boolean) => {
        setMessages(prev => prev.map(msg => 
          msg.id === finalMessageId ? { 
            ...msg, 
            text: fullText, // 实时显示累积文本
            durationMs: isComplete ? (performance.now() - (currentQueryStartTimeRef.current || 0)) : undefined
          } : msg
        ));
      }
    ).then(finalResponse => {
      if (cancelRequestRef.current) {
        setIsDiscussionActive(false);
        setCurrentDiscussion(null);
        return;
      }

      if (finalResponse.error) {
        if (finalResponse.error.includes("API key not valid") || finalResponse.error.includes("401")) {
          setMessages(prev => prev.map(msg => 
            msg.id === finalMessageId ? { 
              ...msg, 
              text: `API密钥无效 (渠道: ${finalAnswerRole.channel.name})，请在配置界面中检查密钥设置。`,
              durationMs: finalResponse.durationMs
            } : msg
          ));
          setIsLoading(false);
          setIsDiscussionActive(false);
          setCurrentDiscussion(null);
          return;
        }
        throw new Error(`${finalAnswerRole.name}: ${finalResponse.text}`);
      }

      setMessages(prev => prev.map(msg => 
        msg.id === finalMessageId ? { 
          ...msg, 
          text: finalResponse.text,
          durationMs: finalResponse.durationMs
        } : msg
      ));

      const finalParsedResponse = parseAIResponse(finalResponse.text);
      if (finalParsedResponse.newNotepadContent !== null) {
        setNotepadContent(finalParsedResponse.newNotepadContent);
        setLastNotepadUpdateBy(createDynamicMessageSender(finalAnswerRole.name));
      }

      // 讨论完成
      setIsLoading(false);
      setIsDiscussionActive(false);
      setCurrentDiscussion(null);
      currentQueryStartTimeRef.current = null;
    }).catch(error => {
      console.error("生成最终答案时出错:", error);
      addMessage(`错误: ${error instanceof Error ? error.message : "生成最终答案时发生未知错误"}`, MessageSender.System, MessagePurpose.SystemNotification);
      setIsLoading(false);
      setIsDiscussionActive(false);
      setCurrentDiscussion(null);
    });
  };

  const handleSendMessage = async (userInput: string, imageFile?: File | null) => {
    if (isLoading) return;
    if (!userInput.trim() && !imageFile) return;
    
    if (channels.length === 0) {
      addMessage("请先配置API渠道。点击设置按钮添加渠道。", MessageSender.System, MessagePurpose.SystemNotification);
      return;
    }
    
    if (activeRoles.length === 0) {
      addMessage("请先配置AI角色。点击设置按钮添加角色。", MessageSender.System, MessagePurpose.SystemNotification);
      return;
    }

    const rolesWithoutApiKey = activeRoles.filter(role => !role.channel.apiKey?.trim());
    if (rolesWithoutApiKey.length > 0) {
      const roleNames = rolesWithoutApiKey.map(role => `${role.name}(${role.channel.name})`).join('、');
      addMessage(`以下角色的API渠道缺少API密钥: ${roleNames}。请在配置界面中设置相应的API密钥。`, MessageSender.System, MessagePurpose.SystemNotification);
      return;
    }

    if (imageFile) {
      const supportsImages = activeRoles.some(role => role.model.supportsImages);
      if (!supportsImages) {
        addMessage("当前活跃的角色都不支持图片处理。请添加支持图片的模型和角色，或移除图片。", MessageSender.System, MessagePurpose.SystemNotification);
        return;
      }
    }

    setIsDiscussionActive(true);
    cancelRequestRef.current = false;
    setIsLoading(true);
    currentQueryStartTimeRef.current = performance.now();
    setCurrentTotalProcessingTimeMs(0);

    let userImageForDisplay: ChatMessage['image'] | undefined = undefined;
    if (imageFile) {
      const dataUrl = URL.createObjectURL(imageFile);
      userImageForDisplay = { dataUrl, name: imageFile.name, type: imageFile.type };
    }

    addMessage(userInput, MessageSender.User, MessagePurpose.UserInput, undefined, userImageForDisplay);
    
    let imageApiPart: { inlineData: { mimeType: string; data: string } } | undefined = undefined;
    if (imageFile) {
      try {
        const base64Data = await fileToBase64(imageFile);
        imageApiPart = {
          inlineData: {
            mimeType: imageFile.type,
            data: base64Data,
          },
        };
      } catch (error) {
        console.error("Error converting file to base64:", error);
        addMessage("图片处理失败，请重试。", MessageSender.System, MessagePurpose.SystemNotification);
        setIsLoading(false);
        setIsDiscussionActive(false);
        return;
      }
    }

    const discussionModeInstruction = discussionMode === DiscussionMode.AiDriven ? AI_DRIVEN_DISCUSSION_INSTRUCTION_PROMPT_PART : "";
    const commonPromptInstructions = NOTEPAD_INSTRUCTION_PROMPT_PART.replace('{notepadContent}', notepadContent) + discussionModeInstruction;

    const roleOrder = [...activeRoles];
    const maxTurnsForLoop = discussionMode === DiscussionMode.AiDriven ? MAX_AI_DRIVEN_DISCUSSION_TURNS_PER_MODEL : manualFixedTurns;

    // 初始化讨论状态
    const discussionState: DiscussionState = {
      currentRoleIndex: 0,
      currentTurn: 0,
      discussionLog: [],
      isFirstMessage: true,
      previousAISignaledStop: false,
      discussionEndCount: 0,
      userQuery: userInput,
      imageApiPart,
      commonPromptInstructions,
      roleOrder,
      maxTurnsForLoop
    };

    setCurrentDiscussion(discussionState);
    
    // 开始第一个AI的回复（不等待）
    processNextRole(discussionState);
    
    // 清理图片URL
    if (userImageForDisplay?.dataUrl.startsWith('blob:')) {
      // 延迟清理，确保消息已渲染
      setTimeout(() => {
        URL.revokeObjectURL(userImageForDisplay.dataUrl);
      }, 5000);
    }
  };
  
  const Separator = () => <div className="h-6 w-px bg-gray-600" aria-hidden="true"></div>;

  const hasValidChannels = channels.some(ch => ch.apiKey?.trim());
  const isSystemReady = hasValidChannels && activeRoles.length > 0;

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto bg-gray-900 shadow-2xl rounded-lg overflow-hidden">
      <header className="p-4 bg-gray-900 border-b border-gray-700 flex items-center justify-between shrink-0 space-x-2 md:space-x-4 flex-wrap">
        <div className="flex items-center shrink-0">
          <BotMessageSquare size={28} className="mr-2 md:mr-3 text-sky-400" />
          <h1 className="text-xl md:text-2xl font-semibold text-sky-400">Multi-Mind Chat 智囊团</h1>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-3 flex-wrap justify-end gap-y-2">
          {/* 讨论控制按钮 */}
          {isDiscussionActive && (
            <div className="flex items-center space-x-2">
              <button
                onClick={interruptDiscussion}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center space-x-1"
                title="中断当前讨论"
              >
                <Square size={16} />
                <span>中断讨论</span>
              </button>
              <Separator />
            </div>
          )}
          
          {/* 导出按钮 - 有消息时始终可用 */}
          {messages.length > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={exportDiscussionRecord}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center space-x-1"
                title="导出对话记录"
                disabled={isLoading}
              >
                <Download size={16} />
                <span>导出记录</span>
              </button>
              <Separator />
            </div>
          )}

          {/* 角色管理器 */}
          <div className="relative flex items-center">
            <label className="text-sm text-gray-300 mr-1.5 flex items-center shrink-0">
              <Users size={18} className="mr-1 text-sky-400"/>
              角色:
            </label>
            <button
              onClick={() => setIsRoleSelectorOpen(!isRoleSelectorOpen)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md p-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none flex items-center space-x-2 min-w-[120px]"
              aria-label="管理AI角色"
            >
              <span className="truncate">{activeRoles.length}个活跃</span>
              <ChevronDown size={16} className={`transition-transform ${isRoleSelectorOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isRoleSelectorOpen && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <h3 className="text-white font-medium">活跃角色</h3>
                    <button
                      onClick={() => {
                        setIsConfigManagerOpen(true);
                        setIsRoleSelectorOpen(false);
                      }}
                      className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 rounded flex items-center space-x-1"
                    >
                      <Settings size={12} />
                      <span>配置</span>
                    </button>
                  </div>
                </div>
                
                {activeRoles.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    <p className="mb-2">暂无活跃角色</p>
                    <button
                      onClick={() => {
                        setIsConfigManagerOpen(true);
                        setIsRoleSelectorOpen(false);
                      }}
                      className="text-sm bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded"
                    >
                      添加角色
                    </button>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {activeRoles.map((role) => (
                      <div key={role.id} className="p-3 border-b border-gray-700 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-white font-medium">{role.name}</h4>
                              <button
                                onClick={() => toggleRoleActiveState(role.id)}
                                className={`p-1 rounded transition-colors ${
                                  role.isActive ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'
                                }`}
                                title={role.isActive ? '暂停角色' : '激活角色'}
                              >
                                {role.isActive ? <Play size={14} /> : <Pause size={14} />}
                              </button>
                            </div>
                            <p className="text-gray-400 text-xs">{role.model.name}</p>
                            <p className="text-gray-500 text-xs">渠道: {role.channel.name}</p>
                            <div className="flex space-x-1 mt-1">
                              {role.model.supportsImages && (
                                <span className="text-xs bg-green-600 text-white px-1 rounded">图像</span>
                              )}
                              {role.model.supportsReducedCapacity && (
                                <span className="text-xs bg-blue-600 text-white px-1 rounded">优化</span>
                              )}
                              {!role.channel.apiKey?.trim() && (
                                <span className="text-xs bg-red-600 text-white px-1 rounded">缺少密钥</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {isRoleSelectorOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsRoleSelectorOpen(false)}
              />
            )}
          </div>
          
          <Separator />

          <div className="flex items-center space-x-1.5">
            <label
              htmlFor="discussionModeToggle"
              className="flex items-center text-sm text-gray-300 cursor-pointer hover:text-sky-400"
              title={discussionMode === DiscussionMode.FixedTurns ? "切换到AI驱动模式" : "切换到固定轮次模式"}
            >
              {discussionMode === DiscussionMode.FixedTurns 
                ? <MessagesSquare size={18} className="mr-1 text-sky-400" /> 
                : <Bot size={18} className="mr-1 text-sky-400" />}
              <span className="mr-1 select-none shrink-0">模式:</span>
              <div className="relative">
                <input
                  type="checkbox"
                  id="discussionModeToggle"
                  className="sr-only peer"
                  checked={discussionMode === DiscussionMode.AiDriven}
                  onChange={() => setDiscussionMode(prev => prev === DiscussionMode.FixedTurns ? DiscussionMode.AiDriven : DiscussionMode.FixedTurns)}
                  aria-label="切换对话模式"
                  disabled={isLoading}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${discussionMode === DiscussionMode.AiDriven ? 'bg-sky-500' : 'bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${discussionMode === DiscussionMode.AiDriven ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-1.5 select-none shrink-0 min-w-[4rem] text-left">
                {discussionMode === DiscussionMode.FixedTurns ? '固定' : 'AI驱动'}
              </span>
            </label>
            {discussionMode === DiscussionMode.FixedTurns && (
              <div className="flex items-center text-sm text-gray-300">
                <input
                  type="number"
                  id="manualFixedTurnsInput"
                  value={manualFixedTurns}
                  onChange={handleManualFixedTurnsChange}
                  min={MIN_MANUAL_FIXED_TURNS}
                  max={MAX_MANUAL_FIXED_TURNS}
                  className="w-14 bg-gray-700 border border-gray-600 text-white text-sm rounded-md p-1 text-center focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  aria-label="设置固定轮次数量"
                  disabled={isLoading}
                />
                <span className="ml-1 select-none">轮</span>
              </div>
            )}
          </div>

          <Separator />

          <label
            htmlFor="capacityToggle"
            className="flex items-center text-sm text-gray-300 cursor-pointer hover:text-sky-400"
            title={isReducedCapacityEnabled ? "切换为优质模式 (完整性能)" : "切换为快速模式 (降低性能)"}
          >
            <SlidersHorizontal size={18} className={`mr-1.5 ${!isReducedCapacityEnabled ? 'text-sky-400' : 'text-gray-500'}`} />
            <span className="mr-2 select-none shrink-0">性能:</span>
            <div className="relative">
              <input
                type="checkbox"
                id="capacityToggle"
                className="sr-only peer"
                checked={!isReducedCapacityEnabled}
                onChange={() => setIsReducedCapacityEnabled(!isReducedCapacityEnabled)}
                aria-label="切换AI性能模式"
                disabled={isLoading}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${!isReducedCapacityEnabled ? 'bg-sky-500 peer-checked:bg-sky-500' : 'bg-gray-600'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!isReducedCapacityEnabled ? 'peer-checked:translate-x-4' : ''}`}></div>
            </div>
            <span className="ml-2 w-20 text-left select-none shrink-0">
              {!isReducedCapacityEnabled ? '优质' : '快速'}
            </span>
          </label>

          <Separator />

          <button
            onClick={() => setIsConfigManagerOpen(true)}
            className="p-2 text-gray-400 hover:text-sky-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-md shrink-0"
            aria-label="配置管理"
            title="配置管理"
          >
            <Settings size={22} />
          </button>

          <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-sky-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-md shrink-0"
            aria-label="清空会话"
            title="清空会话"
            disabled={isLoading}
          >
            <RefreshCcw size={22} />
          </button>
        </div>
      </header>

      <div className="flex flex-row flex-grow overflow-hidden">
        <div className="flex flex-col w-2/3 md:w-3/5 lg:w-2/3 h-full">
          <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-800 scroll-smooth">
            {messages.map((msg) => {
              const streamingState = streamingMessages.get(msg.id);
              const displayMessage = streamingState && !streamingState.isComplete 
                ? { ...msg, text: streamingState.text }
                : msg;
              
              return <MessageBubble key={msg.id} message={displayMessage} />;
            })}
          </div>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} isApiKeyMissing={!isSystemReady} />
        </div>

        <div className="w-1/3 md:w-2/5 lg:w-1/3 h-full bg-slate-800">
          <Notepad
            content={notepadContent}
            lastUpdatedBy={lastNotepadUpdateBy}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 配置管理器 */}
      <ModelConfigManager
        isOpen={isConfigManagerOpen}
        onClose={() => setIsConfigManagerOpen(false)}
        onConfigChange={loadConfiguration}
      />

      {/* 处理时间显示 */}
      {(isLoading || (currentTotalProcessingTimeMs > 0 && !isLoading) || (isLoading && currentTotalProcessingTimeMs === 0)) && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-gray-900 bg-opacity-80 text-white p-2 rounded-md shadow-lg text-xs z-50">
          总耗时: {(currentTotalProcessingTimeMs / 1000).toFixed(2)}s
          {isDiscussionActive && (
            <div className="text-green-400 mt-1">讨论进行中...</div>
          )}
        </div>
      )}

      {/* 系统状态提示 */}
      {!isSystemReady && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 p-3 bg-orange-700 text-white rounded-lg shadow-lg flex items-center text-sm z-50">
          <AlertTriangle size={20} className="mr-2" /> 
          {!hasValidChannels ? '请配置API渠道和密钥' : '请配置AI角色'}
          。点击设置按钮进行配置。
        </div>
      )}
    </div>
  );
};

export default App;
import { BusinessAiUsageInfo } from './ai.usage.service';

export interface ChatHistoryMessage {
    role: 'user' | 'model';
    text: string;
}

export interface AiChatAction {
    type: 'DOWNLOAD_PDF' | 'NAVIGATE' | 'VIEW_DATA' | 'OPEN_WHATSAPP' | 'ACTION_CONFIRM';
    label: string;
    endpoint?: string;
    url?: string;
    filename?: string;
    params?: Record<string, any>;
}

export interface AiSubagentInfo {
    id: string;
    name: string;
    badge: string;
    role?: string;
}

export interface AiChatResponse {
    text: string;
    actions: AiChatAction[];
    modelUsed?: string;
    usage?: BusinessAiUsageInfo;
    subagent?: AiSubagentInfo;
    suggestedOptions?: string[];
}

export interface ToolExecutionResult {
    data: any;
    action?: AiChatAction;
}

import { BusinessAiUsageInfo } from './ai.usage.service';

export interface ChatHistoryMessage {
    role: 'user' | 'model';
    text: string;
}

export interface AiUserContext {
    userId?: number;
    membershipId?: number;
    roleCode?: string;
    isSuperAdmin?: boolean;
}

export interface AiConfirmSummaryLine {
    label: string;
    value: string;
}

export interface AiChatAction {
    type: 'DOWNLOAD_PDF' | 'NAVIGATE' | 'VIEW_DATA' | 'OPEN_WHATSAPP' | 'ACTION_CONFIRM';
    label: string;
    endpoint?: string;
    url?: string;
    filename?: string;
    params?: Record<string, any>;
    summaryLines?: AiConfirmSummaryLine[];
    totalLabel?: string;
    confirmMessage?: string;
    cancelMessage?: string;
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
    suggestedOptions?: string[];
}

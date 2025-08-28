import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface Conversation {
  id: string;
  type: 'peer' | 'group' | 'provider' | 'crisis';
  name: string;
  participants: any[];
  lastMessage?: any;
  unreadCount: number;
  isEncrypted: boolean;
}

interface MessagingState {
  conversations: Conversation[];
  activeConversation: string | null;
  messages: {[conversationId: string]: any[]};
  typingUsers: {[conversationId: string]: string[]};
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  isLoading: boolean;
  error: string | null;
}

const initialState: MessagingState = {
  conversations: [],
  activeConversation: null,
  messages: {},
  typingUsers: {},
  connectionStatus: 'disconnected',
  isLoading: false,
  error: null,
};

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations.unshift(action.payload);
    },
    updateConversation: (state, action: PayloadAction<{id: string; updates: Partial<Conversation>}>) => {
      const index = state.conversations.findIndex(conv => conv.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = {...state.conversations[index], ...action.payload.updates};
      }
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversation = action.payload;
    },
    setMessages: (state, action: PayloadAction<{conversationId: string; messages: any[]}>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{conversationId: string; message: any}>) => {
      if (!state.messages[action.payload.conversationId]) {
        state.messages[action.payload.conversationId] = [];
      }
      state.messages[action.payload.conversationId].push(action.payload.message);
    },
    updateTypingUsers: (state, action: PayloadAction<{conversationId: string; users: string[]}>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.users;
    },
    setConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'connecting'>) => {
      state.connectionStatus = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  setActiveConversation,
  setMessages,
  addMessage,
  updateTypingUsers,
  setConnectionStatus,
  setLoading,
  setError,
} = messagingSlice.actions;

export default messagingSlice.reducer;
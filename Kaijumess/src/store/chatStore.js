import { create } from 'zustand';

const useChatStore = create((set, get) => ({
    conversations: [],
    activeConversation: null,
    messages: {},

    setConversations: (conversations) => set({ conversations }),

    setActiveConversation: (conversation) => set({ activeConversation: conversation }),

    addMessage: (conversationId, message) => set((state) => ({
        messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
        }
    })),

    setMessages: (conversationId, messages) => set((state) => ({
        messages: { ...state.messages, [conversationId]: messages }
    })),
}));

export default useChatStore;
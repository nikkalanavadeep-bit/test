const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');

class SupabaseService {
  /**
   * Retrieves all chat conversations
   */
  static async listConversations() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, model, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations from Supabase:', error.message);
      throw error;
    }

    return data || [];
  }

  /**
   * Retrieves a specific conversation with all associated messages
   */
  static async getConversation(conversationId) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Get conversation details
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      console.warn(`Conversation ${conversationId} not found in Supabase:`, convError?.message);
      return null;
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error(`Error fetching messages for ${conversationId}:`, msgError.message);
      throw msgError;
    }

    return {
      ...conv,
      messages: messages || []
    };
  }

  /**
   * Creates a new conversation
   */
  static async createConversation({ title = 'New Chat', model = 'gemini-1.5-flash', id } = {}) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const payload = {
      title,
      model,
      updated_at: new Date().toISOString()
    };
    if (id) payload.id = id;

    const { data, error } = await supabase
      .from('conversations')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation in Supabase:', error.message);
      throw error;
    }

    return data;
  }

  /**
   * Updates conversation title or timestamp
   */
  static async updateConversation(conversationId, updates = {}) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating conversation ${conversationId}:`, error.message);
      throw error;
    }

    return data;
  }

  /**
   * Deletes a conversation and its messages (cascade)
   */
  static async deleteConversation(conversationId) {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error(`Error deleting conversation ${conversationId}:`, error.message);
      throw error;
    }

    return true;
  }

  /**
   * Saves an individual message into messages table
   */
  static async saveMessage({ conversationId, role, content }) {
    const supabase = getSupabaseClient();
    if (!supabase || !conversationId) return null;

    // Ensure conversation exists or create on the fly
    const { data: convCheck } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();

    if (!convCheck) {
      const initialTitle = (content || 'New Chat').slice(0, 32);
      await this.createConversation({ id: conversationId, title: initialTitle });
    }

    // Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: role === 'user' ? 'user' : 'model',
        content
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message to Supabase:', error.message);
      throw error;
    }

    // Touch conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  }
}

module.exports = SupabaseService;

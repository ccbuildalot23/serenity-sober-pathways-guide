// Mock Firebase Cloud Messaging for testing
export class MockFCM {
  private tokens: Map<string, string> = new Map();
  private messages: any[] = [];

  async send(message: any) {
    this.messages.push(message);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString()
    };
  }

  async sendMulticast(message: any) {
    const results = message.tokens.map((token: string) => ({
      success: true,
      messageId: `mock_${Date.now()}_${Math.random()}`,
      token
    }));
    
    this.messages.push(message);
    
    return {
      responses: results,
      successCount: results.length,
      failureCount: 0
    };
  }

  async sendToTopic(topic: string, message: any) {
    this.messages.push({ topic, ...message });
    return {
      success: true,
      messageId: `mock_topic_${Date.now()}_${Math.random()}`
    };
  }

  registerToken(userId: string, token: string) {
    this.tokens.set(userId, token);
  }

  getToken(userId: string) {
    return this.tokens.get(userId);
  }

  getMessages() {
    return this.messages;
  }

  clearMessages() {
    this.messages = [];
  }
}

// Export both names for compatibility
export class MockFCMService extends MockFCM {}

export default new MockFCM();
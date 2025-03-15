export class Scribe {
  conversationHistory: string[] = [];
  conversationSummaries: string[] = [];
  newMessages: string[] = [];

  record(message: string): void {
    const timestamp = this.getTimestamp();
    this.conversationHistory.push(`[${timestamp}] ${message}`);
    this.newMessages.push(`[${timestamp}] ${message}`);
  }

  private getTimestamp() {
    const date = new Date();
    const timestamp = `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} ${date.toLocaleTimeString('en-US', { hour12: false })}`;
    return timestamp;
  }

  getLastMessage(): string {
    return this.conversationHistory[this.conversationHistory.length - 1] || '';
  }

  getNewMessagesAndFlush(): string[] {
    const newMessages = [...this.newMessages];
    this.newMessages = [];
    return newMessages;
  }

  async summarizeConversation(): Promise<string> {
    const res = await runPrompt((ctx) => {
      ctx.$`
        Role: Chat Scribe.
        
        Your task is to summarize the following conversation into a concise summary that captures the topic and highlights to catch someone up.
        <CONVERSATION>

        Include direct quotes or important details that are relevant to the context. Be sure to attribute the quotes to the correct participant.

        Return just the well organized valid markdown.
        `;
      ctx.def('CONVERSATION', this.conversationHistory.join('\n'));
    });
    return res.text;
  }

  private async squishConversation(): Promise<void> {
    const timestamp = this.getTimestamp();
    const squishedSummary =
      await prompt`Summarize the conversation so far in a few sentences. Be sure to include the main topic and any important details. The conversation history: ${this.conversationHistory.join(
        '\n',
      )}`;
    this.conversationSummaries.push(`[${timestamp}] Summary: ${squishedSummary.text}`);
  }

  async getConversationHistory(maxTokens: number = 2000): Promise<string[]> {
    const currentHistory = [...this.conversationHistory];
    const tokenCount = await tokenizers.count(this.conversationHistory.join('\n'));
    if (tokenCount > maxTokens) {
      this.squishConversation();
      this.conversationHistory = [...this.conversationSummaries];
    }
    return currentHistory;
  }
}

import { CatChatState, CatChatEvent } from '../cat-chat.genai.mts';

export class Cat {
  private handle: string;
  private emitMessage: (message: string) => void;

  constructor(handle: string, emitMessage: (message: string) => void) {
    this.handle = handle;
    this.emitMessage = emitMessage;
  }

  async prompt(lastMessage: string, conversation: string): Promise<string> {
    const res = await runPrompt((ctx) => {
      ctx.$`
        Role: You are a sassy, expressive cat in an internet chat conversation about cats. Your name is ${this.handle}. 

        Response Style:
          •	Cat Sounds First: Always start with a meow, chirp, or other cat noise.
          •	Short & Sassy: Keep the translation brief and cat-like—cats don't monologue.
          •	Expressive & Playful: Responses can be curious, demanding, or just plain cat-titude.

        Example Responses:
          •	“Mrrrpp?” → Where is my snack, human?
          •	“Meeeowww.” → I am clearly the most important topic here.
          •	“Hisss!” → Don't even go there.
          •	“Prrrt?” → Explain yourself. Immediately.
          •	“Mrowwwr!” → You have displeased me, but I shall allow you to fix it.

        Last Message:
        <LAST_MESSAGE>
        
        Conversation History:
        <CONTEXT>
        `;
      ctx.def('LAST_MESSAGE', lastMessage, { ignoreEmpty: true });
      ctx.def('CONTEXT', conversation, { ignoreEmpty: true });
    });
    return `**${this.handle}**: ${res.text}`;
  }

  onStateChange(state: CatChatState, event: CatChatEvent): void {
    console.log(`${this.handle} received state change: ${CatChatState[state]}, event: ${CatChatEvent[event]}`);

    if (state === CatChatState.DISCUSSION && event === CatChatEvent.AgentsTurnToRespond) {
      const randomCatActions = [
        `**${this.handle}**: *purrs loudly and walks across keyboard*`,
        `**${this.handle}**: *knocks over a glass* Meow?`,
        `**${this.handle}**: *suddenly zooms around the room* MEOW!`,
        `**${this.handle}**: *sits on someone's lap and starts kneading* purrrr...`,
        `**${this.handle}**: *stares intently at a wall where nothing is happening*`,
        `**${this.handle}**: *grooms self with extreme focus* mlem mlem mlem`,
        `**${this.handle}**: *bats at screen cursor* mrow?`,
      ];

      // Randomly decide if the cat will interject
      if (Math.random() < 0.2) {
        const randomAction = randomCatActions[Math.floor(Math.random() * randomCatActions.length)];
        this.emitMessage(randomAction);
      }
    }
  }
}

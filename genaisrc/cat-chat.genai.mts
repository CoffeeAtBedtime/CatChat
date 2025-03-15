script({
  model: 'openai:gpt-4o-mini',
  files: ['rag/**/*.*'],
});
//import { classify } from 'genaiscript/runtime';
import { Server } from './server.ts';
import { StateMachine } from './state-machine.ts';
import { Scribe } from './agents/scribe.mts';
import { Participant } from './agents/participant.mts';
import { Cat } from './agents/cat.mts';

export enum CatChatState {
  INIT,
  WAITING_FOR_INPUT,
  DISCUSSION,
  COMPLETE,
}

export enum CatChatEvent {
  StartConversation,
  UserInputReceived,
  AgentsTurnToRespond,
  CatNeedsToBeFed,
}

class CatChat implements StateMachine<CatChatState, CatChatEvent> {
  state: CatChatState = CatChatState.INIT;
  private participant1 = new Participant('🧔‍♂️: IAintLion1590');
  private participant2 = new Participant('👱‍♀️: MittensMom135');
  private cat: Cat;

  private scribeAgent = new Scribe();
  private server: Server;
  private userInputResolver?: (input: string) => void;
  private listeners: Array<(state: CatChatState, event: CatChatEvent) => void> = [];
  private currentUserInput: string = '';

  constructor(server: Server) {
    this.server = server;
    // Set up the server callback to funnel user input.
    this.server.setHandleUserInput(this.handleUserInput.bind(this));

    // Make cat a listener and emitter.
    this.cat = new Cat('🐈: Whiskers', (message: string) => {
      this.server.emitConversationUpdate(message);
    });
    this.subscribe(this.cat.onStateChange.bind(this.cat));
  }

  subscribe(listener: (state: CatChatState, event: CatChatEvent) => void): void {
    this.listeners.push(listener);
  }

  unsubscribe(listener: (state: CatChatState, event: CatChatEvent) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(event: CatChatEvent): void {
    for (const listener of this.listeners) {
      listener(this.state, event);
    }
  }

  getState(): CatChatState {
    return this.state;
  }

  reset(newState?: CatChatState): void {
    this.state = newState || CatChatState.INIT;
  }

  // Returns a promise that will resolve when user input is received.
  async waitForUserInput(): Promise<string> {
    return new Promise((resolve) => {
      this.userInputResolver = resolve;
    });
  }

  async handleUserInput(input: string): Promise<void> {
    // this.classifyInput(input).then((isCat) => {
    //   if (!isCat) {
    //     this.server.emitConversationUpdate('👮 Administrator: Remember we only talk about cats here.');
    //   }
    // });
    this.currentUserInput = input;

    if (this.userInputResolver) {
      this.userInputResolver(input);
      this.userInputResolver = undefined;
    }
    await this.process(CatChatEvent.UserInputReceived);
  }

  async transition(state: CatChatState, event: CatChatEvent): Promise<CatChatState> {
    switch (state) {
      case CatChatState.INIT:
        if (event === CatChatEvent.StartConversation) {
          await this.server.emitConversationUpdate('👮 Administrator: **Welcome to CatChat!**');
          return CatChatState.WAITING_FOR_INPUT;
        }
        break;
      case CatChatState.WAITING_FOR_INPUT:
        if (event === CatChatEvent.UserInputReceived) {
          await this.scribeAgent.getNewMessagesAndFlush(); // Clear buffer

          await this.scribeAgent.record(`👴 GrandPaw1951: ${this.currentUserInput}`);

          const messages = await this.scribeAgent.getNewMessagesAndFlush();
          for (const message of messages) {
            await this.server.emitConversationUpdate(message);
          }

          return CatChatState.DISCUSSION;
        }
        break;
      case CatChatState.DISCUSSION:
        if (event === CatChatEvent.AgentsTurnToRespond) {
          const conversation = (await this.scribeAgent.getConversationHistory()).join('\n');
          const responses = await Promise.all([
            this.participant1.prompt(this.scribeAgent.getLastMessage(), conversation, env.files),
            this.participant2.prompt(this.scribeAgent.getLastMessage(), conversation, env.files),
            // this.cat.prompt(this.scribeAgent.getLastMessage(), conversation),
          ]);
          await this.scribeAgent.getNewMessagesAndFlush(); // Clear buffer

          responses.forEach((message) => this.scribeAgent.record(message));
          const messages = await this.scribeAgent.getNewMessagesAndFlush();
          for (const message of messages) {
            await this.server.emitConversationUpdate(message);
          }
          this.server.emitCurrentTopic(await this.scribeAgent.summarizeConversation());
          return CatChatState.WAITING_FOR_INPUT;
        }
        if (event === CatChatEvent.CatNeedsToBeFed) return CatChatState.COMPLETE;
        break;
      default:
        throw new Error('Invalid state');
    }
    return state;
  }

  async process(event: CatChatEvent): Promise<void> {
    this.notifyListeners(event);

    this.state = await this.transition(this.state, event);
    this.server.emitCurrentState(CatChatState[this.state].toString());
    console.log(`State updated to ${CatChatState[this.state]} after event: ${CatChatEvent[event]}`);
  }

  async run(): Promise<void> {
    await this.process(CatChatEvent.StartConversation);

    // Global run loop: continues until a terminal state is reached.
    while (true) {
      if (this.state === CatChatState.WAITING_FOR_INPUT) {
        const input = await this.waitForUserInput();
        await this.process(CatChatEvent.UserInputReceived);
      } else if (this.state === CatChatState.DISCUSSION) {
        await this.process(CatChatEvent.AgentsTurnToRespond);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async start(): Promise<void> {
    await this.server.start();
    this.state = CatChatState.INIT;
    // Give the server time to start.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  stop(): void {
    this.server.stop();
  }

  // private async classifyInput(input: string): Promise<boolean> {
  //   const { label } = await classify(input, {
  //     cat: 'about cats',
  //     not: 'not about cats',
  //   });
  //   return label === 'cat' ? true : false;
  // }
}

const catChatMachine = new CatChat(new Server());
await catChatMachine.start();
await catChatMachine.run().catch(console.error);

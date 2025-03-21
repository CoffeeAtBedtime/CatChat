script({
  model: 'openai:gpt-4o-mini',
  files: ['rag/**/*.*'], // Including all the files confuses many models consider commenting these out at that point
});
//import { classify } from 'genaiscript/runtime';
import { Server } from './server.ts';
import { StateMachine } from './state-machine.ts';
import { Scribe } from './agents/scribe.mts';
import { Participant } from './agents/participant.mts';
import { Cat } from './agents/cat.mts';
import { ParticipantBuilder } from './utils/participant-builder.mts';

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
  ParticipantsComeAndGo,
}

class CatChat implements StateMachine<CatChatState, CatChatEvent> {
  state: CatChatState = CatChatState.INIT;
  private server: Server;
  private userInputResolver?: (input: string) => void;
  private currentUserInput: string = '';
  private fileIndex: WorkspaceFileIndex;

  // The regulars
  private participants: Participant[] = [
    new Participant('🧔‍♂️: IAintLion1590'),
    new Participant('👱‍♀️: MittensMom135'),
    new Participant('🧑‍🦰: KatLover42'),
    new Participant('👨‍🦱: RikkiTikki80'),
    new Participant('👩‍🦳: AllieCat_1'),
  ];
  private cat: Cat;
  private scribeAgent = new Scribe();

  private listeners: Array<(state: CatChatState, event: CatChatEvent) => void> = [];

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

  private async initializeVectorSearch(): Promise<void> {
    this.fileIndex = await retrieval.index('catchat');
    await this.fileIndex.insertOrUpdate(env.files); // This could take a bit if you have a lot of files
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
          // Check if any participants are mentioned in the last message
          const mentionedParticipants = this.participants.filter((participant) => {
            // Extract the name without emoji (e.g., "IAintLion1590" from "🧔‍♂️: IAintLion1590")
            const nameWithoutEmoji = participant.getName().split(':')[1]?.trim() || '';
            const lastMessageLower = this.scribeAgent.getLastMessage().toLowerCase();
            const nameLower = nameWithoutEmoji.toLowerCase();
            return lastMessageLower.includes(nameLower) || lastMessageLower.includes(`@${nameLower}`);
          });

          // Process mentioned participants sequentially to allow each to see the previous response
          for (const participant of mentionedParticipants) {
            const currentConversation = (await this.scribeAgent.getConversationHistory()).join('\n');
            const message = await participant.prompt(this.scribeAgent.getLastMessage(), currentConversation, this.fileIndex);
            await this.scribeAgent.record(message);
            const [newMessage] = await this.scribeAgent.getNewMessagesAndFlush();
            await this.server.emitConversationUpdate(newMessage);
          }

          // Randomly select 1-2 participants to respond
          const numberOfResponders = Math.floor(Math.random() * 2) + 1;
          const shuffledParticipants = [...this.participants].sort(() => Math.random() - 0.5);
          const selectedParticipants = shuffledParticipants.slice(0, numberOfResponders);

          console.log(`Selected ${numberOfResponders} participants to respond to this message`);

          // Process participants sequentially to allow each to see the previous response
          for (const participant of selectedParticipants) {
            const currentConversation = (await this.scribeAgent.getConversationHistory()).join('\n');
            const message = await participant.prompt(this.scribeAgent.getLastMessage(), currentConversation, this.fileIndex);
            await this.scribeAgent.record(message);
            const [newMessage] = await this.scribeAgent.getNewMessagesAndFlush();
            await this.server.emitConversationUpdate(newMessage);
          }

          await this.scribeAgent.summarizeConversation().then((summary) => {
            this.server.emitCurrentTopic(summary);
          });

          return CatChatState.DISCUSSION;
        }
        if (event === CatChatEvent.ParticipantsComeAndGo) {
          if (Math.random() < 0.1) {
            const newParticipant = ParticipantBuilder.createNewParticipant();
            this.participants.push(newParticipant);
            await this.server.emitConversationUpdate(`👮 Administrator: **${newParticipant.getName()}** has joined the chat.`);
          }

          if (Math.random() < 0.1 && this.participants.length > 3) {
            const indexToRemove = Math.floor(Math.random() * this.participants.length);
            const removedParticipant = this.participants[indexToRemove];
            this.participants.splice(indexToRemove, 1);
            await this.server.emitConversationUpdate(`👮 Administrator: **${removedParticipant.getName()}** has left the chat.`);
          }
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
        await this.process(CatChatEvent.ParticipantsComeAndGo);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async start(): Promise<void> {
    await this.server.start();
    this.state = CatChatState.INIT;
    // Give the server time to start.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.initializeVectorSearch();
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

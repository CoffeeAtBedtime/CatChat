import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import marked from 'marked';
import { Builder } from 'selenium-webdriver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Server {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private handleUserInputCallback?: (input: string) => void;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server);
    this.setupRoutes();
    this.setupSocket();
  }

  private setupRoutes(): void {
    // Serve the index.html file.
    this.app.get('/', (req, res) => {
      const indexFilePath = path.join(__dirname, '../index.html');
      res.sendFile(indexFilePath);
    });
    // API endpoint to receive user input.
    this.app.use(express.json());
    this.app.post('/api/input', (req, res) => {
      const input = req.body.input;
      if (this.handleUserInputCallback) {
        this.handleUserInputCallback(input);
      }
      res.status(200).send('Input received');
    });
  }

  private setupSocket(): void {
    this.io.on('connection', (socket) => {
      console.log('A user connected');
      socket.on('disconnect', () => console.log('User disconnected'));
      socket.on('userInput', (input: string) => {
        if (this.handleUserInputCallback) {
          this.handleUserInputCallback(input);
        }
      });
    });
  }

  setHandleUserInput(callback: (input: string) => void): void {
    this.handleUserInputCallback = callback;
  }

  emitConversationUpdate(conversation: string): void {
    this.io.emit('conversationUpdate', marked(conversation));
  }

  emitCurrentTopic(currentTopic: string): void {
    this.io.emit('currentTopicUpdate', marked(currentTopic));
  }

  emitCurrentState(state: string): void {
    this.io.emit('stateUpdate', state);
  }

  async start(port = 3000): Promise<void> {
    this.server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
    const driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().setRect({ width: 1920, height: 1080 });

    await driver.get(`http://localhost:${port}`);
  }

  stop(): void {
    this.io.close(() => {
      console.log('Socket.IO server closed');
    });
    this.server.close(() => {
      console.log('HTTP server closed');
    });
  }
}

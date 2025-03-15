/**
 * Interface representing a generic state machine.
 *
 * This interface defines the contract for a state machine with states of type TState
 * and events of type TEvent. It provides methods for processing events, performing
 * state transitions, running the state machine, and handling external input. It also
 * includes subscription methods so that external modules can listen for state changes.
 *
 * @template TState - The type representing the states of the state machine.
 * @template TEvent - The type representing the events that trigger state transitions.
 */
export interface StateMachine<TState, TEvent> {
  /**
   * Returns the current state of the state machine.
   *
   * @returns {TState} The current state.
   */
  getState(): TState;

  /**
   * Processes an event, triggering a state transition.
   *
   * This method takes an event and performs the necessary logic to transition
   * from the current state to a new state. It returns a promise that resolves
   * when the event has been fully processed.
   *
   * @param {TEvent} event - The event to process.
   * @returns {Promise<void>} A promise that resolves when processing is complete.
   */
  process(event: TEvent): Promise<void>;

  /**
   * Given a state and an event, calculates and returns the next state.
   *
   * This method encapsulates the transition logic of the state machine.
   * It can be used for simulation, testing, or composing complex transitions.
   *
   * @param {TState} state - The current state.
   * @param {TEvent} event - The event that triggers the transition.
   * @returns {Promise<TState>} A promise that resolves with the new state.
   */
  transition(state: TState, event: TEvent): Promise<TState>;

  /**
   * Runs the state machine's main loop.
   *
   * This method is responsible for continuously processing events and keeping
   * the state machine active. It may run indefinitely unless the state machine
   * is explicitly stopped.
   *
   * @returns {Promise<void>} A promise that resolves only when the machine stops.
   */
  run(): Promise<void>;

  /**
   * Starts the state machine.
   *
   * Performs any necessary initialization logic and gets the state machine ready
   * to process events.
   *
   * @returns {Promise<void>} A promise that resolves once initialization is complete.
   */
  start(): Promise<void>;

  /**
   * Stops the state machine gracefully.
   *
   * This method should perform any cleanup necessary and halt the main loop.
   */
  stop(): void;

  /**
   * Resets the state machine to a specific state.
   *
   * If no state is provided, the state machine resets to its initial state.
   *
   * @param {TState} [newState] - The state to reset to.
   */
  reset(newState?: TState): void;

  /**
   * Subscribes a listener to state transitions.
   *
   * The provided listener will be invoked whenever the state machine transitions to a new state.
   *
   * @param {(state: TState, event: TEvent) => void} listener - A callback function to be notified of state changes.
   */
  subscribe(listener: (state: TState, event: TEvent) => void): void;

  /**
   * Unsubscribes a previously registered listener.
   *
   * @param {(state: TState, event: TEvent) => void} listener - The callback function to remove.
   */
  unsubscribe(listener: (state: TState, event: TEvent) => void): void;

  /**
   * Handles external user input.
   *
   * Processes input provided by an external source (such as a web UI or CLI)
   * and triggers the corresponding events in the state machine.
   *
   * @param {string} input - The external input to process.
   * @returns {Promise<void>} A promise that resolves after the input has been handled.
   */
  handleUserInput(input: string): Promise<void>;
}

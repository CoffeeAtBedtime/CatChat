import { Participant } from '../agents/participant.mts';

export class ParticipantBuilder {
  static createNewParticipant(): Participant {
    const name = this.createRandomName();
    return new Participant(name);
  }

  static createRandomName(): string {
    const emoji = this.getRandomElement(this.emojis);
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    const number = this.getRandomNumber(1, 999);

    // 🧔‍♂️: FelixEnthusiast8
    return `${emoji}: ${firstName}${lastName}${number}`;
  }

  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static firstNames = [
    'Whisker',
    'Paw',
    'Purr',
    'Meow',
    'Feline',
    'Tabby',
    'Kitty',
    'Cat',
    'Mittens',
    'Tiger',
    'Lion',
    'Panther',
    'Kitten',
    'Felix',
    'Tom',
    'Luna',
    'Shadow',
    'Boots',
    'Fluffy',
    'Ginger',
    'Claw',
    'Socks',
    'Spot',
    'Fur',
  ];

  private static lastNames = [
    'Lover',
    'Friend',
    'Fan',
    'Whisperer',
    'Adorer',
    'Enthusiast',
    'Pal',
    'Person',
    'Companion',
    'Admirer',
    'Appreciator',
    'Parent',
    'Guardian',
    'Buddy',
    'Follower',
    'Devotee',
    'Keeper',
    'Protector',
    'Afficionado',
  ];

  private static emojis = ['👱‍♀️', '👱‍♂️', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '🧔‍♀️', '🧔‍♂️', '👨‍🦳', '👩‍🦳', '👴', '👵', '👨', '👩', '🧑', '👦', '👧', '🧒'];
}

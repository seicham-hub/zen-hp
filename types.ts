export enum Season {
  Spring = 'Spring',
  Summer = 'Summer',
  Autumn = 'Autumn',
  Winter = 'Winter'
}

export enum TimeOfDay {
  Day = 'Day',
  Sunset = 'Sunset',
  Night = 'Night'
}

export interface HaikuData {
  line1: string;
  line2: string;
  line3: string;
  author?: string;
}

export const HAIKUS: HaikuData[] = [
  { line1: "The old pond,", line2: "A frog jumps in:", line3: "Plop! Sound of water.", author: "Bashō" },
  { line1: "In the cherry blossom's shade", line2: "there's no such thing", line3: "as a stranger.", author: "Issa" },
  { line1: "First winter rain—", line2: "even the monkey", line3: "seems to want a raincoat.", author: "Bashō" },
  { line1: "Silence—", line2: "the cicada's cry", line3: "pierces the rocks.", author: "Bashō" },
  { line1: "Light of the moon", line2: "Moves west, flowers' shadows", line3: "Creep eastward.", author: "Buson" },
  { line1: "I write, erase, rewrite", line2: "Erase again, and then", line3: "A poppy blooms.", author: "Hokushi" },
  { line1: "Winter seclusion -", line2: "Listening, that evening,", line3: "To the rain in the mountain.", author: "Issa" },
  { line1: "A world of dew,", line2: "And within every dewdrop", line3: "A world of struggle.", author: "Issa" }
];

export const ZEN_KOANS = [
  "What is the sound of one hand clapping?",
  "When you meet the Buddha, kill him.",
  "Sitting quietly, doing nothing, Spring comes, and the grass grows by itself.",
  "No snowflake ever falls in the wrong place.",
  "To study the Way is to study the self."
];
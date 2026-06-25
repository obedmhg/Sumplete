// Selectable BrickHeadz-style hoppers. Each is a palette + a couple of feature
// flags the Character component reads to build a boxy figure. Names are original
// (not trademarked) but evoke One Piece / arcade-game looks.

export type CapType = "cap" | "straw" | "spikes" | "none"

export type CharacterDef = {
  id: string
  name: string
  /** Head / face base colour (skin for humans, fur for the animal ones). */
  skin: string
  /** Lighter lower-face patch (animal muzzles); omit for humans. */
  muzzle?: string
  cap: string
  capType: CapType
  /** Secondary hat/hair colour: straw band, spike tips, cap stripe. */
  capAccent?: string
  shirt: string
  bib: string
  shoe: string
  /** Glove / hand colour; defaults to skin. */
  hand?: string
  /** Round clown nose; omit for none. */
  nose?: string
  eye?: string
  mustache?: boolean
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "straw-captain",
    name: "Straw Captain",
    skin: "#e0a878",
    cap: "#e6b94e",
    capType: "straw",
    capAccent: "#9a2b2b",
    shirt: "#b3122a",
    bib: "#2440a0",
    shoe: "#6b4a2a",
    eye: "#1a1014",
  },
  {
    id: "plumber-red",
    name: "Red Plumber",
    skin: "#f4c79a",
    cap: "#e63946",
    capType: "cap",
    shirt: "#e63946",
    bib: "#2a4cd6",
    shoe: "#4a2c12",
    mustache: true,
  },
  {
    id: "plumber-green",
    name: "Green Plumber",
    skin: "#f4c79a",
    cap: "#2fa84f",
    capType: "cap",
    shirt: "#2fa84f",
    bib: "#2a4cd6",
    shoe: "#4a2c12",
    mustache: true,
  },
  {
    id: "crimson-guardian",
    name: "Crimson Guardian",
    skin: "#d8362b",
    muzzle: "#e8c79a",
    cap: "#d8362b",
    capType: "spikes",
    shirt: "#d8362b",
    bib: "#b62a22",
    shoe: "#2fa84f",
    hand: "#f5f5f5",
    eye: "#7c5cc4",
  },
  {
    id: "shadow-racer",
    name: "Shadow Racer",
    skin: "#1c1c1c",
    muzzle: "#e8d8b0",
    cap: "#1c1c1c",
    capType: "spikes",
    capAccent: "#d11414",
    shirt: "#1c1c1c",
    bib: "#2a2a2a",
    shoe: "#d11414",
    hand: "#f5f5f5",
    eye: "#ff2b2b",
  },
  {
    id: "blue-sprinter",
    name: "Blue Sprinter",
    skin: "#1f6fe0",
    muzzle: "#e8c79a",
    cap: "#1f6fe0",
    capType: "spikes",
    shirt: "#1f6fe0",
    bib: "#1a5cc0",
    shoe: "#d11414",
    hand: "#f5f5f5",
    eye: "#1a1014",
  },
  {
    id: "clown-pirate",
    name: "Clown Pirate",
    skin: "#f0c89a",
    cap: "#39a9dc",
    capType: "spikes",
    capAccent: "#e8771f",
    shirt: "#a3201f",
    bib: "#7a1817",
    shoe: "#4a2c12",
    nose: "#e01e1e",
    eye: "#1a1014",
  },
  {
    id: "green-swordsman",
    name: "Green Swordsman",
    skin: "#e0a878",
    cap: "#2f7d32",
    capType: "cap",
    shirt: "#e8e8e8",
    bib: "#1f2933",
    shoe: "#1a1014",
    eye: "#1a1014",
  },
  {
    id: "orange-navigator",
    name: "Orange Navigator",
    skin: "#f0c89a",
    cap: "#e8771f",
    capType: "spikes",
    shirt: "#f2a900",
    bib: "#2440a0",
    shoe: "#6b4a2a",
    eye: "#1a1014",
  },
  {
    id: "pixel-knight",
    name: "Pixel Knight",
    skin: "#9aa3ad",
    cap: "#7d8893",
    capType: "cap",
    capAccent: "#c0c8d0",
    shirt: "#5b6770",
    bib: "#c0c8d0",
    shoe: "#2a2f36",
    hand: "#c0c8d0",
    eye: "#22d3ee",
  },
]

export const DEFAULT_CHARACTER_ID = "plumber-red"

export function characterById(id: string | null | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER_ID)!
}

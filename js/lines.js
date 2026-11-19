// ============================================================
//  ALL THE WORDS IN THE GAME LIVE HERE.
//  Edit anything between the quotes. Keep the quotes and commas.
//  Every line starts with "YO JOHN" — that's the law.
// ============================================================

const LINES = {
  title: "You really thought you weren't gonna have to drive home again",
  subtitle: "Boulder → Durango. Don't forget to hook the toe.",

  // Shown under each stop on the map before it opens
  lockedText: "YO JOHN, not yet. Opens",

  // Random things yelled when you crash into something
  crash: [
    "YO JOHN, that was a person on a bike.",
    "YO JOHN, the car has feelings too.",
    "YO JOHN, eyes on the road please.",
    "YO JOHN, that's gonna leave a mark.",
    "YO JOHN, insurance is not gonna love this.",
  ],

  // Hook the toe
  toePrompt: "HOOK THE TOE",
  toeSuccess: [
    "TOE HOOKED.",
    "YO JOHN, beautiful toes.",
    "YO JOHN, that's a clean hook.",
    "TOE: HOOKED. CRISIS: AVERTED.",
  ],
  toeFail: [
    "YO JOHN, the toe went unhooked.",
    "YO JOHN, you left the toe hanging.",
    "YO JOHN, the toe is disappointed in you.",
  ],

  // Good things never last long. Shown when a boost runs out.
  doesntLastLong: [
    "YO JOHN, it doesn't last long.",
    "YO JOHN, it never lasts long.",
    "YO JOHN, see? It doesn't last long.",
  ],

  // Driving through a puddle (she hates the water)
  waterCold: [
    "YO JOHN, THE WATER IS COLD.",
    "YO JOHN, the water is SO cold.",
    "YO JOHN, cold water. Cold. Water.",
  ],

  // ---------------- LEVEL 1: BOULDER ----------------
  boulder: {
    name: "Boulder",
    intro: [
      "YO JOHN, it's time to drive home to Durango.",
      "Steer with the arrow keys (or the buttons on your phone). Grab the chrysanthemums. Don't hit the bikes. Boulder has a LOT of bikes.",
      "Kombucha makes you go fast. And avoid the puddles, because the water is cold.",
      "And if you see HOOK THE TOE... hook the toe. (Tap it, or hit Space.)",
    ],
    signs: [
      "YO JOHN, Pearl St →",
      "Subaru count: 47",
      "YO JOHN, bike lane = bike land",
      "Kombucha 2 mi",
      "YO JOHN, the prairie dogs are watching",
      "Subaru count: 112",
    ],
    devilsThumbSign: "YO JOHN, Devil's Thumb ↑",
    devils: "YO JOHN, the Devil's Thumb sent some friends.",
    boost: "YO JOHN, KOMBUCHA POWER!",
    snackBreak: "YO JOHN, hold on. Snack break. *munch munch munch*",
    snackDone: "...that was the last Snickers. Anyway.",
    gpsWarning: "YO JOHN, GPS RECALCULATING — CONTROLS FLIPPED",
    fakeComplete: "LEVEL COMPLETE!",
    forgot: [
      "YO JOHN... wait. (It doesn't last long.)",
      "You ate ALL the road trip Snickers in like four minutes.",
      "You can't drive over a mountain pass without Snickers. Everyone knows this.",
      "We're going back to the gas station.",
    ],
    backSign: "YO JOHN, gas station: back that way (ugh)",
    missedSnickers: "YO JOHN, you drove right past the Snickers. Again.",
    gotSnickers: "YO JOHN, SNICKERS ACQUIRED. You found the Snickers charm for your bracelet!",
    finalSign: "US-285 SOUTH → Durango",
    note:
      "YO JOHN, you made it out of Boulder! I know the drive is long, but every mile gets you closer to the people who love you. I'm so proud of you. (Placeholder: write your Day 1 note here!)",
  },

  // ---------------- FUTURE LEVELS (not built yet) ----------------
  kenosha: { name: "Kenosha Pass" },
  buenaVista: { name: "Buena Vista" },
  wolfCreek: { name: "Wolf Creek Pass" },
  durango: { name: "Durango" },

  comingSoon: "YO JOHN, this part of the road is still being paved. Check back soon.",
  birthday: "YO JOHN, HAPPY BIRTHDAY!",
};

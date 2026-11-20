// ============================================================
//  ALL THE WORDS IN THE GAME LIVE HERE.
//  Edit anything between the quotes. Keep the quotes and commas.
//  Every line starts with "YO JOHN" — that's the law.
//
//  VOICE: record any line on the recording page (record.html).
//  If you change a line's words, re-record it. If you add, remove
//  or reorder lines inside a [ list ], re-record that list.
// ============================================================

const LINES = {
  title: "You really thought you weren't gonna have to drive home again",
  subtitle: "Boulder → Durango. Don't forget to hook the toe.",
  soundHint: "🔊 Turn your sound on.",

  // Birthday countdown on the map ({n} becomes the number of days)
  birthdayCountdown: "🎂 {n} days till the birthday",
  birthdayTomorrow: "🎂 The birthday is TOMORROW",
  birthdayToday: "🎂 IT'S THE BIRTHDAY!",

  // Shown under each stop on the map before it opens
  lockedText: "YO JOHN, not yet. Opens",

  // Random things yelled when you crash into something
  crash: [
    "YO JOHN, that was a person on a bike.",
    "YO JOHN, the car has feelings too.",
    "YO JOHN, eyes on the road please.",
    "YO JOHN, that's gonna leave a mark.",
    "YO JOHN, I don't think insurance is gonna love this.",
  ],

  // Hook the toe
  toePrompt: "HOOK THE TOE",
  toeSuccess: [
    "I DON'T REALLY KNOW HOW IT WORKS",
  ],
  toeFail: [
    "YO JOHN, the toe was not unhooked. Unbelievable.",
    "YO JOHN, you left the toe hanging.",
    "YO JOHN, the toe is disappointed in you.",
  ],

  // Good things never last long. Shown when a boost runs out.
  doesntLastLong: [
    "YO JOHN, it doesn't last long.",
    "YO JOHN, it never lasts long.",
    "YO JOHN, see? It doesn't last that long.",
  ],

  // Driving through a puddle (she hates the water)
  waterCold: [
    "YO JOHN, THE WATER IS COLD.",
    "YO JOHN, THE WATER IS SO COLD.",
    "YO JOHN, COLD WATER. COLD. WATER.",
  ],

  // Shown a moment after the water shrinks everything
  gotSmall: [
    "DAMN, THAT GOT SMALL.",
  ],

  // ---------------- LEVEL 1: BOULDER ----------------
  boulder: {
    name: "Boulder",
    intro: [
      "YO JOHN. I need to get out of Boulder. The frats here violate penguins.",
      "My birthday is in 5 days. I HAVE to be home in Durango by the 25th.",
      "Will you help me get there?",
      "YO Reese, Imma need you to steer with the arrow keys or the buttons on your phone. Grab the chrysanthemums. Please don't hit the bikes. It's not a good thing to do.",
      "I know how much you love kombucha, so it makes you go fast. Avoid the puddles, because THE WATER IS A LITTLE COLD and you just don't want to do that.",
      "If you see HOOK THE TOE... you need to HOOK THE TOE.",
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
    devils: "YO JOHN, the Devil's Thumb sent you some friends.",
    boost: "YO JOHN, THIS JOKE IS SO FUCKING STUPID.",
    floodSign: "YO JOHN, Boulder Creek flooding ahead",
    flood: "YO JOHN, I don't think there's any way around this one.",
    snackBreak: "Reese is a little fat ass.",
    snackDone: "I can't believe you ate the last Snickers bar. Unreal.",
    gpsWarning: "YO JOHN, WE FUCKED UP. GPS RECALCULATED.",
    fakeComplete: "HOLY SHIT, YOU DID IT.",
    forgot: [
      "YO JOHN, wait. Doesn't last that long.",
      "You literally ate ALL the road trip Snickers in like four minutes.",
      "I mean, you can't drive over a mountain pass without a Snickers bar. I thought you knew this.",
      "We have to go back. We're going back. You're doing it again.",
    ],
    backSign: "YO JOHN, gas station: back that way (ugh)",
    missedSnickers: "YO, you literally just drove past the Snickers bar again. We need that.",
    gotSnickers: "YO, you got the Snickers bar? Now you're ready. And you get a little charm for your bracelet, possibly. I don't know though.",

    // The frat guys show up for the last stretch
    fratsAppear: [
      "YO JOHN... is that the frat?",
      "FUCKING DRIVE.",
    ],
    fratTaunts: [
      "YO JOHN, they're yelling SEND IT. Fuck.",
      "At least they got kinda bomb music taste.",
      "YO JOHN, one of them is currently doing a keg stand IN the van.",
      "YO, they want to know if you're coming to the darty or not.",
    ],
    fratCaught: "THE FRAT GUYS GOT YOU bro. They took 2 of your flowers. It's fucked up.",
    fratLost: "YO JOHN, we lost them. For now.",

    outro: [
      "YO JOHN, WE MADE IT OUT OF BOULDER.",
      "At least you did it. One leg down, four to go. Good luck.",
    ],
    finalSign: "US-285 SOUTH → Durango",
    note:
      "Happy birthday Reese. In 5 days you'll be done. Hopefully this game that you need to complete to get your gift certificate brings you something these next 5 days. I love you.",
  },

  // ---------------- FUTURE LEVELS (not built yet) ----------------
  kenosha: { name: "Kenosha Pass" },
  buenaVista: { name: "Buena Vista" },
  wolfCreek: { name: "Wolf Creek Pass" },
  durango: { name: "Durango" },

  comingSoon: "YO JOHN, this part of the road is still being paved. Check back soon.",
  birthday: "YO JOHN, HAPPY BIRTHDAY!",
};

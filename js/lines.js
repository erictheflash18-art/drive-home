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

  // Save code box on the map
  saveTitle: "💾 Save code",
  saveHelp: "Your progress lives on this device. Copy this code and keep it somewhere safe (text it to yourself). It brings your progress back on any phone or computer.",
  copyButton: "Copy",
  copied: "Copied!",
  loadHelp: "Got a code? Paste it here:",
  loadButton: "Load",
  loadedOk: "YO JOHN, progress restored.",
  loadedBad: "YO JOHN, that code doesn't look right. Check you copied the whole thing.",

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
  // ---------------- LEVEL 2: KENOSHA PASS ----------------
  kenosha: {
    name: "Kenosha Pass",
    intro: [
      "Reese, we made it out of Boulder. Next up is Kenosha Pass at 10,000 feet.",
      "Right button is GAAS. Left button is JUMP. No brakes. Brakes are for quitters.",
      "Jump over the slow semis and minivans, because I know damn well you don't want to wait behind them. Try NOT to rear-end them.",
      "The car runs on Snickers now, just like you. You need to get them or you'll get hangry.",
      "It's 4 days till your birthday, Reece. Let's fucking go.",
    ],
    signs: [
      "US-285 SOUTH",
      "YO JOHN, Kenosha Pass 12 mi",
      "No passing zone",
      "YO JOHN, falling rock",
      "Watch for bighorn sheep",
      "Runaway truck ramp →",
      "Welcome to South Park",
    ],
    rvAppear: "It's messed up.",
    rvTaunts: [
      "The RV has a bumper sticker. He's fucking losers.",
      "Reese, we're going 15 miles an hour. We gotta fix this.",
      "Reese, I'm a penguin and I could walk faster than this.",
      "Oh, the RV just signaled? Nevermind. It didn't.",
    ],
    rvGone: "The RV FINALLY pulled over. Freedom.",
    rvNoJump: "Reece, you can't jump the RV as much as you wanna.",
    // Ramming the back of the RV: 1st and 2nd hit, then the 3rd blows it up
    rvRam: [
      "Bang! That old couple was driving way too slow.",
      "That RV is smoking. One more time.",
    ],
    rvHint: "Hey YO JOHN, I think that RV can take a hit.",
    rvSurvived: "RV survived",
    rvDestroyed: "RV destroyed",
    rvBoom: [
      "DANG, I CAN'T BELIEVE YOU BLEW UP THAT RV.",
      "Don't worry. Those slow ass grandparents parachuted out.",
    ],
    rearEnd: [
      "EO, you just rear-ended a semi.",
      "The minivan is fine. You are not.",
      "The button literally says JUMP. Push it.",
    ],
    roofBounce: "I mean, you're on top of a truck, Mr. Chill.",
    skierHit: [
      "You just got hit by a skier doing a road gap.",
      "That skier did NOT look both ways.",
      "SEND IT, said the skier. Into you.",
    ],
    skierYell: "SEND IT!",
    steepWarning: "It's icy. Easy on the gas or you'll flip.",
    easyGas: "YO, EASY ON THE GAS.",
    flipped: [
      "Reese, why the fuck did you flip the car?",
      "Wheels DOWN Reece, wheels DOWN.",
      "The car is totalled. Here's another one.",
    ],
    lowFuel: "We're running low on Snickers, Reece. We're going to need you to get some more.",
    hangry: "Breeze, you ran out of Snickers. It's not the same when you're hungry.",
    checkpoint: "CHECKPOINT",
    summitSign: "KENOSHA PASS · ELEV 10,000 FT",
    trailSign: "Colorado Trail",
    gotCharm: "Someone left a bike charm here. The door is now.",
    fratsAppear: [
      "Is that SIGTA? They're tailgating at the summit.",
      "THEY SAW US RE-SEND IT DOWN THE MOUNTAIN.",
    ],
    fratTaunts: [
      "Currently, shotgunning beers at 10,000 feet.",
      "And they're wearing shorts. It's 20 degrees. And flip flops.",
      "They're yelling SKI SEASON BRO REES. Let's not hatch.",
    ],
    fratCaught: "They got you again, Reese. They took two flowers from you. That stopped.",
    fratClose: "THEY'RE RIGHT BEHIND US. GO GO GO GO GO.",
    fratLost: "Lost them again, Reece. Fuck yeah.",
    outro: [
      "YOU DID IT REECE, OVER KENOSHA PASS.",
      "Welcome to South Park. Buena Vista opens tomorrow.",
    ],
    completeTitle: "YO JOHN, KENOSHA PASS: CONQUERED.",
    note: "I hope your actual drive home today is a little safer. Text me when you get there. I love you",
  },
  // ---------------- LEVEL 3: BUENA VISTA (rafting) ----------------
  buenaVista: {
    name: "Buena Vista",
    intro: [
      "YO JOHN, the car is done. One RV explosion was too many.",
      "So we're rafting the Arkansas River the rest of the way to Buena Vista. You love rafting.",
      "Tap the left and right buttons to paddle. Alternate them to go faster. Dodge the rocks.",
      "Just... stay IN the raft. THE WATER IS COLD.",
      "3 days till my birthday.",
    ],
    signs: ["Pinball Rapid", "Zoom Flume", "Raft Ripper", "Welcome to Buena Vista"],
    rapidWarning: "YO JOHN, RAPIDS. Hold on to something.",
    rockHit: [
      "YO JOHN, that was a rock.",
      "YO JOHN, the river has rocks in it. Who knew.",
      "YO JOHN, the raft is fine. Probably.",
    ],
    pusherAppear: [
      "YO JOHN, it's Chad from ΣΤΓ. He's paddling over.",
      "YO JOHN, Chad is back. Paddle away from Chad.",
      "YO JOHN, CHAD AGAIN. He does not give up.",
    ],
    pusherTaunts: [
      "Chad: JUST HOP IN, IT'S REFRESHING!",
      "Chad: Come on, the water's not even that cold!",
      "Chad: You love rafting! Rafting is basically swimming!",
    ],
    pushedIn: "Chad pushed you in.",
    pusherWindup: "YO JOHN, CHAD IS WINDING UP. MOVE.",
    pusherGiveUp: "Chad: ...fine. Next time.",
    grandparents: "YO JOHN, the RV grandparents are STILL floating.",
    bottleFound: "YO JOHN, a message in a bottle:",
    bottles: [
      "YO JOHN, (Placeholder memory #1: write a real memory of you two here!)",
      "YO JOHN, (Placeholder memory #2: something only you two would get.)",
      "YO JOHN, (Placeholder memory #3: the sweetest one.)",
    ],
    rainStops: "YO JOHN... the rain stopped. Look up.",
    gotCharm: "YO JOHN, the last raindrop. It's a charm for your bracelet.",
    outro: [
      "YO JOHN, WE MADE IT TO BUENA VISTA. Mostly dry.",
      "Wolf Creek Pass opens tomorrow. 2 days till my birthday.",
    ],
    completeTitle: "YO JOHN, BUENA VISTA: MOSTLY DRY.",
    note: "YO JOHN, (Placeholder: write your Day 3 note here!)",
  },
  wolfCreek: { name: "Wolf Creek Pass" },
  durango: { name: "Durango" },

  comingSoon: "YO JOHN, this part of the road is still being paved. Check back soon.",
  birthday: "YO JOHN, HAPPY BIRTHDAY!",
};

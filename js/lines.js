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
      "Happy birthday Reese. In 5 days hopefully you'll be done. Hopefully this game that you need to complete your gift certificate brings you something. Love you.",
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
      "It's 4 days till your birthday, Reese. Let's fucking go.",
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
    rvNoJump: "Reese, you can't jump the RV as much as you wanna.",
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
      "Wheels DOWN Reese, wheels DOWN.",
      "The car is totalled. Here's another one.",
    ],
    lowFuel: "We're running low on Snickers, Reese. We're going to need you to get some more.",
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
      "They're yelling SKI SEASON BRO REESE. Let's not hatch.",
    ],
    fratCaught: "They got you again, Reese. They took two flowers from you. That stopped.",
    fratClose: "THEY'RE RIGHT BEHIND US. GO GO GO GO GO.",
    fratLost: "Lost them again, Reese. Fuck yeah.",
    outro: [
      "YOU DID IT REESE, OVER KENOSHA PASS.",
      "Welcome to South Park. Buena Vista opens tomorrow.",
    ],
    completeTitle: "YO JOHN, KENOSHA PASS: CONQUERED.",
    note: "I hope your actual drive home today is a little safer. Text me when you get there. I love you",
  },
  // ---------------- LEVEL 3: BUENA VISTA (rafting) ----------------
  buenaVista: {
    name: "Buena Vista",
    intro: [
      "The car is done. Since you blew up the RV, we no longer can drive, so now you're going to have to raft down the river.",
      "You love rafting so I don't think this is going to be a problem for you.",
      "Tap the left and right buttons to paddle. You can alternate them to go faster if you're just feeling a little impatient, which you probably are.",
      "And sometimes there's some monsters.",
      "3 days till your birthday Reese. That's coming up soon.",
    ],
    signs: ["Pinball Rapid", "Zoom Flume", "Raft Ripper", "Welcome to Buena Vista"],
    rapidWarning: "RAPIDS, Reese, RAPIDS. Hold on to something.",
    rockHit: [
      "That's a rock. I know you like 'em, but it's gotta hurt.",
      "Rivers have rocks. Who knew.",
      "He probably didn't pop the raft.",
    ],
    pusherAppear: [
      "It's Chad from ΣΤΓ. He's paddling over.",
      "Chad is back, Reese. Paddle away from Chad.",
      "CHAD does not give up bro. We're stealing his beer so I know why.",
      "He's back for ONE more try, Reese.",
    ],
    chadFalls: [
      "Damn. Chad fucking fell in. What a loser.",
      "YEAH, ISN'T THE WATER COLD, EH?",
    ],
    monsterSeen: "Did you see that?",
    hotSpringsSign: "Hot springs ♨",
    hotSprings: "This water is warm?",
    hotSpringsMiss: "I'm so disappointed.",
    shake: "*shake shake shake*",
    pusherTaunts: [
      "YOU KNOW, JUST HOP IN, IT IS REFRESHING.",
      "Come on, the water's not even that cold!",
      "You love rafting! Rafting is basically swimming!",
    ],
    pushedIn: "Chad pushed you in.",
    surferHit: [
      "You ran over a river surfer, Reese. What if that was me?",
      "BRAH.",
      "You literally just killed Cody.",
    ],
    beerGrab: [
      "What a steal.",
      "ETR must have left these from their last arty.",
      "Are you spinning or is the river spinning?",
    ],
    pusherWindup: "CHAD IS WINDING UP, REESE. GET THE FUCK OUT OF THE WAY.",
    pusherGiveUp: "Fine. I don't get to next time.",
    grandparents: "RV grandparents are STILL going bro, they do NOT give up.",
    bottleFound: "YO JOHN, a message in a bottle:",
    bottleMissed: "You missed a bottle. Get it back.",
    keepPaddling: "Keep paddling",
    bottles: [
      "Reese, last summer was so fun. I'm so glad we got to go on so many adventures together and spend so many great nights in your van. I can't wait to go on more and go flower hunting with you again!!",
      "Reese, on top of all of our adventures, thanks for being the chillest mother fucker alive. I love that I can always lock my keys in the car, make you surf, or even force you to ride over rocks for four fucking hours in the smoke, and you are still smiling, having a good time.",
      "Also thanks for never losing your hesh core steez from when you were a kid. Literally the toughest person I know. And also you probably have the hottest side eye I've ever seen.",
    ],
    // Little signs next to the scenes before each bottle (van bridge, locked keys, kid Reese)
    refs: ["Van life ♥", "Keys: locked in. Again.", "Hesh core since day one"],
    rainStops: "Aww, the rain stopped. This was sad.",
    gotCharm: "It's the raindrop charm. Congrats.",
    outro: [
      "YO, WE MADE IT TO BV. Mostly dry, but it was just the rain, so that's always good.",
      "Wolf Creek Pass. And just 2 days till your birthday, Reese.",
    ],
    completeTitle: "YO JOHN, BUENA VISTA: MOSTLY DRY.",
    note: "Reese, I hope you have another great day. I hope your drive home went smooth yesterday. Maybe you should go get some coffee with Bailey to go celebrate, but you probably won't because I told you to do that. So anyway, I hope you find something fun to do. Tell your mom hi. I love you so much and I'm so excited for your birthday in three days. Also, thanks for telling me your address. I appreciate it and when you're going to be home because no reason to worry about it.",
  },
  // ---------------- LEVEL 4: WOLF CREEK PASS (backcountry skiing) ----------------
  wolfCreek: {
    name: "Wolf Creek Pass",
    intro: [
      "Reese, we made it to the top of Wolf Creek Pass, but unfortunately, we still don't have the car, so we're gonna have to ski down.",
      "It's still stuck in a ditch, and remember what happened last time we stuck in a ditch? It's pretty bomb, but like, kinda bad.",
      "Not doing that again. So good thing you brought your skis.",
      "Hold left and right to carve. Hit the pillows to get some air. There's also jumps that you can hit. You can spin and do some 360s. You gotta hook the toe to start though. Don't hit the trees. Well, you can hit the trees probably. Probably will.",
      "Two days to your birthday. I'm so, so fucking pumped for you.",
    ],
    bindingPrompt: "Get a click into your bindings first.",
    passSign: "WOLF CREEK PASS · Elev. 10,857 ft",
    wcSign: "WOLF CREEK · backcountry · you're on your own",
    beaconCheck: "Beep beep. Beacon on.",
    powder: "Oh my god it's so deep. Faceshots.",
    powderEnds: "And it's gone. Powder's gone.",
    glades: "Trees.",
    treeHit: [
      "Trees.",
      "Trees!",
      "Trees.",
    ],
    yardSale: [
      "YARD SALE.",
      "YARD SALE.",
      "That was a full yard sale.",
    ],
    creekWarning: "Use the snow bridge, Reese. It's a creek.",
    pillows: "Helloooo's.",
    kickerHint: "Hit the wind lip.",
    gully: "Ride the walls.",
    cliffChoice: "Send it.",
    creekDitch: "Stuck in a ditch. Again.",
    cliffSend: ["SEND IT.", "HUCK IT.", "Big mountain penguin."],
    sideways: "Cannot land sideways.",
    spinLanded: [
      "THREE-SIXTY. Who taught you that.",
      "SEVEN-TWENTY.",
      "TEN-EIGHTY?! Reese. REESE.",
    ],
    cliff: "SEND IT.",
    landed: [
      "BANG!",
      "BANG.",
      "HATALES, STEEZY, HESH CORE.",
    ],
    ice: "Turning is more of a suggestion here.",
    iceToe: "Hook that toe.",
    snickers: "Instant speed.",
    sledsAppear: "It's ETR on fucking snowmobiles.",
    sledYell: ["BRAAAP", "SEND IT BRO", "BRAAAAAP", "OUR STASH BRO"],
    sledHit: [
      "Got hit by a snowmobile.",
      "BRO this is OUR stash.",
      "Two-stroke exhaust right in the face.",
    ],
    chadAppear: [
      "Chad on a sled.",
      "Chad's back.",
    ],
    chadWindup: "GET THE FUCK OUT OF THE WAY.",
    chadGiveUp: "Chad got stuck in a tree.",
    chadFinale: "CHAD's going for the cornice.",
    avalanche: "HE TRIGGERED AN AVALANCHE. GO, GO, GO.",
    avaClose: "IT'S RIGHT BEHIND YOU.",
    avaStops: "It didn't last that long.",
    grandparents: "RV GRANDPARENTS LANDED. Hell yeah.",
    stormClears: "Bluebird Day, Reese.",
    gotCharm: "It's the ski charm.",
    memoryFound: "YO JOHN, a note in the snow:",
    memoryMissed: "You missed a note.",
    keepSkiing: "Keep skiing",
    memories: [
      "Remember getting stuck in that ditch? It was one of the best nights of my life. I would get stuck in a ditch with you again.",
      "Reese, I'm so excited to watch you ski, go skin up, and lift some epic backcountry lines, make it look easy.",
      "I'm so excited to ski with you again. Let's do some powder days and probably get some cold toes as well.",
    ],
    roadSign: "US-160 · Pagosa Springs →",
    chadDitch: "Chad's sled is in a ditch.",
    outro: [
      "HELL YEAH, JUST SKIED WOLF CREEK PASS.",
      "Durango opens tomorrow, Reese. And then it's your birthday.",
    ],
    completeTitle: "YO JOHN, WOLF CREEK: SENT.",
    note: "Two more days. I hope today felt like a powder day. Love you.",
  },
  // ---------------- LEVEL 5: DURANGO (the finale) ----------------
  durango: {
    name: "Durango",
    intro: [
      "YO JOHN. Bottom of Wolf Creek. Skis off. Bike on.",
      "Last leg, Reese. The hills above Durango. Ride wherever you want up here. There's gifts hiding on the hill. Look for the light beams.",
      "Then ΣΤΓ wants a race. Down the mountain, off a cliff, through town. Winner gets home first.",
      "Lean left and right to steer. Hit the jumps. Spin in the air. You know the drill.",
      "1 day till your birthday, Reese.",
    ],
    no3d: ["YO JOHN, your phone doesn't want to do 3D today. That's okay. Let's skip right to the good part."],
    clipIn: "Clip in.",
    startSign: "DURANGO · 1 day to go",
    freeRide: "Free ride. Go explore. Find the gifts.",
    jumpSign: "DIRT JUMPS →",
    jumpLine: "Dirt jump line. Pump it. Spin it.",
    dropSign: "THE DROP ↓",
    dropHint: "Wooden drop ahead. Hit it on the trail. Send it.",
    dropSend: ["SEND IT.", "Big drop, Reese.", "Wheels up."],
    giftFound: "YO JOHN, a gift on the hill:",
    giftMissed: "You missed a gift. It's up ahead.",
    keepRiding: "Keep riding",
    gifts: [
      "PLACEHOLDER: write gift 1 in the recorder.",
      "PLACEHOLDER: write gift 2 in the recorder.",
      "PLACEHOLDER: write gift 3 in the recorder.",
    ],
    raceSoon: "ΣΤΓ at the start line. Chad brought his bros. It's a race.",
    raceStartGate: "RACE START",
    raceGo: "3... 2... 1... GO GO GO.",
    missedGate: "Missed a checkpoint. They're catching up.",
    rockGarden: "Rock garden. Pick a line.",
    berms: "Berms. Ride the walls.",
    creek: "Creek crossing. Stay on the bridge or hit the lip.",
    cliffSign: "⚠ CLIFF · WINGSUIT ZONE",
    cliffWarn: "The trail ends at a cliff. Good thing you packed a wingsuit.",
    wingsuit: "WINGSUIT. Fly through the rings.",
    chute: "Chute open. Here comes Durango.",
    landTown: "Main Ave. Race it home.",
    welcomeGate: "WELCOME TO DURANGO",
    finishGate: "RACE FINISH",
    shops: ["COFFEE", "BIKE SHOP", "TACOS", "BOOKS", "FLOWERS", "ICE CREAM", "GEAR", "PIZZA", "BAKERY", "RECORDS"],
    chadCrash: "Chad crashed into the flower shop.",
    raceWin: "YOU WON. ΣΤΓ IS DONE. FOREVER.",
    raceLose: "They beat you, but they cheated. Everyone knows.",
    gotCharm: "The chrysanthemum charm. The last one.",
    almostHome: "Almost home, Reese.",
    treeHit: ["Tree.", "That tree was there the whole time.", "Bark. Ouch."],
    crash: ["Over the bars.", "Yard sale, bike edition.", "Tuck and roll."],
    sideways: "Landed sideways.",
    spinLanded: ["THREE-SIXTY.", "SEVEN-TWENTY.", "TEN-EIGHTY?! Reese."],
    landed: ["Stomped it.", "Clean.", "Steezy."],
    finale: [
      "YO JOHN. You made it home, Reese.",
      "Boulder to Durango. Five days. One penguin. Zero ΣΤΓ.",
      "And tomorrow is your birthday.",
      "I love you. Now go get your gift.",
    ],
    finaleTitle: "HAPPY BIRTHDAY, REESE!",
    finaleSub: "You drove (and skied, and rafted, and biked) all the way home.",
    certButton: "🎁 Open your gift certificate",
    note: "PLACEHOLDER: write the last note in the recorder.",
    certificate: {
      title: "Gift Certificate",
      to: "For: Reese",
      body: "Good for one birthday present, hand delivered:",
      items: ["🌼 A bouquet of chrysanthemums", "📿 One bracelet with all five charms from the drive home"],
      from: "From: Eric ♥",
      fine: "Print this. Hand it over to redeem. No expiration. Hook the toe to activate. YO JOHN approved.",
      printButton: "🖨️ Print it",
      mapButton: "🎁 Gift certificate",
    },
  },

  comingSoon: "YO JOHN, this part of the road is still being paved. Check back soon.",
  birthday: "HAPPY BIRTHDAY!",
};

export const FILTERS=[
  "Does this strengthen or weaken my foundation?",
  "Would my future self thank me for this?",
  "Does this align with my principles or feed my ego?",
  "Is this comfort-seeking or capacity-building?",
  "Does this increase or decrease self-respect?"
];

export const SKILLS=[
  {name:"Strength training",domain:"Body & physical",xp:85,gem:"linear-gradient(135deg,#FFD6AA,#ECB8FF)"},
  {name:"Deep focus",domain:"Mind & cognition",xp:90,gem:"linear-gradient(135deg,#A9CBFF,#B39AFF)"},
  {name:"System architecture",domain:"Executive output",xp:70,gem:"linear-gradient(135deg,#D4FF9C,#9EF9FF)"},
  {name:"Writing & prose",domain:"Communication",xp:60,gem:"linear-gradient(135deg,#E2C9FF,#8CFFDD)"},
];

export const ARCS=[
  {
    id:"renaissance_foundation",
    name:"Renaissance Foundation",
    descriptor:"Install the base operating system. Build daily ritual integrity.",
    weeks:4,
    gem:"linear-gradient(135deg,#E2C9FF,#8CFFDD)",
    phases:[
      {week:1,title:"Anchor",focus:"Lock the morning sequence. Train daily. Sleep before 11."},
      {week:2,title:"Restraint",focus:"Consume less. Produce more. No impulse scrolling."},
      {week:3,title:"Output",focus:"Ship one meaningful thing per day. No exceptions."},
      {week:4,title:"Integration",focus:"All systems running without negotiation."}
    ]
  },
  {
    id:"discipline_installation",
    name:"Discipline Installation",
    descriptor:"Build the spine. Remove negotiation from your behavior.",
    weeks:6,
    gem:"linear-gradient(135deg,#FFD6AA,#ECB8FF)",
    phases:[
      {week:1,title:"Inventory",focus:"Audit every place you negotiate with yourself."},
      {week:2,title:"Removal",focus:"Eliminate one comfort behavior completely."},
      {week:3,title:"Friction",focus:"Add deliberate difficulty to one daily action."},
      {week:4,title:"Endurance",focus:"Complete what you start. No abandonment."},
      {week:5,title:"Voluntary discomfort",focus:"Cold, fasting, silence — choose one."},
      {week:6,title:"Lock",focus:"Discipline is default. No willpower required."}
    ]
  },
  {
    id:"social_confidence",
    name:"Social Confidence",
    descriptor:"Build presence. Speak less. Mean more. Lead without permission.",
    weeks:8,
    gem:"linear-gradient(135deg,#A9CBFF,#B39AFF)",
    phases:[
      {week:1,title:"Eye contact",focus:"Hold eye contact in every interaction."},
      {week:2,title:"Initiation",focus:"Speak first in three situations daily."},
      {week:3,title:"Directness",focus:"Say what you mean. No qualifiers."},
      {week:4,title:"Pacing",focus:"Slow your speech. Use silence."},
      {week:5,title:"Disagreement",focus:"Disagree once a day without aggression."},
      {week:6,title:"Leadership",focus:"Lead one group decision per day."},
      {week:7,title:"Conflict tolerance",focus:"Stay in one uncomfortable conversation."},
      {week:8,title:"Presence",focus:"Enter rooms without anxiety. Stay grounded."}
    ]
  },
  {
    id:"stoic_control",
    name:"Stoic Control",
    descriptor:"Master the gap between stimulus and response.",
    weeks:6,
    gem:"linear-gradient(135deg,#D4FF9C,#9EF9FF)",
    phases:[
      {week:1,title:"Notice",focus:"Catch reactions before acting on them."},
      {week:2,title:"Pause",focus:"Insert 3 seconds between trigger and response."},
      {week:3,title:"Reframe",focus:"Find the principle hidden in every annoyance."},
      {week:4,title:"Detachment",focus:"Care less about outcomes you cannot control."},
      {week:5,title:"Equanimity",focus:"Same face in victory and loss."},
      {week:6,title:"Sovereignty",focus:"Emotions report to you, not the reverse."}
    ]
  }
];

export const VIRTUES=[
  {name:"Discipline",challenge:"Finish the hardest task before anything else.",reflection:"Where did you negotiate with yourself today?"},
  {name:"Temperance",challenge:"Consume less than you produce today.",reflection:"Where did you overindulge or seek comfort?"},
  {name:"Courage",challenge:"Initiate one difficult conversation or action.",reflection:"Where did you avoid discomfort?"},
  {name:"Patience",challenge:"Respond slowly. Do not react.",reflection:"Where did you rush or force an outcome?"},
  {name:"Justice",challenge:"Be fair in every interaction today.",reflection:"Where did you act from ego instead of principle?"},
  {name:"Honor",challenge:"Keep every commitment you make today.",reflection:"Where did you compromise your word?"},
];

export const PILLARS=[
  {name:"Mind",descriptor:"Cognition & knowledge",score:72,gem:"linear-gradient(135deg,#A9CBFF,#B39AFF)"},
  {name:"Craft",descriptor:"Output & execution",score:65,gem:"linear-gradient(135deg,#D4FF9C,#9EF9FF)"},
  {name:"Body",descriptor:"Strength & discipline",score:80,gem:"linear-gradient(135deg,#FFD6AA,#ECB8FF)"},
  {name:"Expression",descriptor:"Communication & presence",score:55,gem:"linear-gradient(135deg,#E2C9FF,#8CFFDD)"},
  {name:"Virtue",descriptor:"Character & integrity",score:68,gem:"linear-gradient(135deg,#9EF9FF,#A9CBFF)"},
];

export const SOCIAL_MISSIONS=[
  // Level 1: Eye contact
  [
    "Hold eye contact with every person you interact with today. Don't look away first.",
    "Make eye contact and nod at the next 5 people who enter your space.",
    "When someone speaks to you, hold eye contact through their full sentence.",
    "Look the next stranger who approaches you directly in the eyes before responding."
  ],
  // Level 2: Initiation
  [
    "Speak first in the next three situations where you would normally wait.",
    "Start a conversation with someone you don't know well today.",
    "Be the first to acknowledge someone entering a room.",
    "Initiate a work or social conversation you've been postponing."
  ],
  // Level 3: Directness
  [
    "State a preference instead of asking for input.",
    "Disagree with one person today without softening it.",
    "Make a request without justifying it.",
    "End a conversation when you're done. Do not over-stay."
  ],
  // Level 4: Leadership
  [
    "Make one group decision without asking for consensus first.",
    "Redirect a conversation that's going nowhere.",
    "Set the agenda or frame for a meeting or group interaction.",
    "Take public responsibility for one outcome today."
  ],
  // Level 5: Presence
  [
    "Enter every room today as if you belong there completely.",
    "Take up physical space — widen your stance, settle into your seat.",
    "Speak less. When you speak, mean it and stop.",
    "Resist the urge to fill silence. Let it sit. Hold your ground."
  ],
  // Level 6: Conflict tolerance
  [
    "Stay in one conversation that makes you uncomfortable. Do not exit early.",
    "Deliver honest feedback to someone without softening it excessively.",
    "Disagree directly with someone more senior or influential than you.",
    "Address one interpersonal tension you have been avoiding."
  ]
];

export const FLASHCARD_DECKS=[
  {
    id:"identity",
    name:"Identity",
    descriptor:"Who you are when no one watches.",
    gem:"linear-gradient(135deg,#E2C9FF,#8CFFDD)",
    cards:[
      {front:"Who are you?",back:"A man who produces value at scale, governs himself under pressure, builds strength in body and character, communicates with precision, loves without losing himself, anchors meaning in God."},
      {front:"What do you refuse?",back:"Performing. Negotiating with myself. Comfort as identity. Outsourcing accountability. Image over coherence."},
      {front:"What is your standard for promises?",back:"Small promises are practice for big ones. I under-promise and over-deliver. I never rely on motivation."}
    ]
  },
  {
    id:"virtue",
    name:"Virtue",
    descriptor:"The practices that build the man.",
    gem:"linear-gradient(135deg,#FFD6AA,#ECB8FF)",
    cards:[
      {front:"Define discipline.",back:"Acting from principle, not mood. Doing what was decided when the deciding self is gone."},
      {front:"Define temperance.",back:"Restraint that creates power. The capacity to want and not act."},
      {front:"Define courage.",back:"Acting in the presence of fear because the principle requires it."}
    ]
  },
  {
    id:"situational",
    name:"Situational",
    descriptor:"Rehearse the moments that matter.",
    gem:"linear-gradient(135deg,#A9CBFF,#B39AFF)",
    cards:[
      {front:"You feel nervous entering a room of strangers. What do you do?",back:"Slow my pace. Lower my shoulders. Make eye contact with one person. Speak first if needed. Anxiety is information, not a directive."},
      {front:"Someone is disrespectful to you in a meeting. What do you do?",back:"Stay calm. Address it directly and briefly. Do not escalate. Do not perform offense. Maintain authority through composure."},
      {front:"You feel the urge to scroll instead of work. What do you do?",back:"Note the urge. Stand up. Five deep breaths. Return to the next concrete action. Do not negotiate."},
      {front:"A woman tests your frame. What do you do?",back:"Hold the frame. Do not argue, do not defend. Smile slightly. Continue as planned. Strength is not reactive."}
    ]
  },
  {
    id:"power",
    name:"Power dynamics",
    descriptor:"How influence actually works.",
    gem:"linear-gradient(135deg,#D4FF9C,#9EF9FF)",
    cards:[
      {front:"What does authority actually require?",back:"Composure under pressure. Clarity in language. Follow-through. Comfort with disapproval. Standards visible in behavior, not announced."},
      {front:"When do you speak?",back:"When I have something true to say. When the silence serves no one. When my voice changes the outcome. Not to fill space."}
    ]
  }
];

export const BOOKS=[
  {id:"meditations",title:"Meditations",author:"Marcus Aurelius",domain:"Philosophy",gem:"linear-gradient(135deg,#FFD6AA,#ECB8FF)",essence:"Sovereignty over the inner citadel."},
  {id:"letters",title:"Letters from a Stoic",author:"Seneca",domain:"Philosophy",gem:"linear-gradient(135deg,#E2C9FF,#8CFFDD)",essence:"Time, restraint, and dying well."},
  {id:"courtier",title:"The Book of the Courtier",author:"Castiglione",domain:"Presence",gem:"linear-gradient(135deg,#A9CBFF,#B39AFF)",essence:"Grace, sprezzatura, and noble bearing."},
  {id:"prince",title:"The Prince",author:"Machiavelli",domain:"Power",gem:"linear-gradient(135deg,#D4FF9C,#9EF9FF)",essence:"How power is actually held and lost."},
  {id:"5rings",title:"The Book of Five Rings",author:"Miyamoto Musashi",domain:"Warfare",gem:"linear-gradient(135deg,#FFD6AA,#9EF9FF)",essence:"Strategy as embodied practice."},
  {id:"autobiography",title:"Autobiography",author:"Benjamin Franklin",domain:"Self-construction",gem:"linear-gradient(135deg,#ECB8FF,#A9CBFF)",essence:"Building a man through method."},
  {id:"republic",title:"The Republic",author:"Plato",domain:"Philosophy",gem:"linear-gradient(135deg,#B39AFF,#8CFFDD)",essence:"Justice in the soul and in the city."},
  {id:"ethics",title:"Nicomachean Ethics",author:"Aristotle",domain:"Virtue",gem:"linear-gradient(135deg,#9EF9FF,#D4FF9C)",essence:"Excellence as habit, not feeling."}
];

export const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const WEEK_SEEDS=[42,17,88,63,29,74,51];

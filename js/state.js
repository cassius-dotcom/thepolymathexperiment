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

export const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const WEEK_SEEDS=[42,17,88,63,29,74,51];

export let state={
  tasks:JSON.parse(localStorage.getItem('cos3_tasks'))||[
    {id:1,text:"Execute weight training splits baseline.",done:true},
    {id:2,text:"Verify database sync connection strings.",done:false}
  ]
};

export function save(){localStorage.setItem('cos3_tasks',JSON.stringify(state.tasks));}

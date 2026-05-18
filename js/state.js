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

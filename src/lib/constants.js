export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const CATEGORIES = [
  'Technology','Business','Design','Science','Mathematics',
  'Health & Medicine','Arts & Humanities','Law','Trades & Vocational',
  'Language','Personal Development','Other'
]

export const LEARNING_STYLES = [
  { id:'visual',      label:'Visual',   icon:'🎨', desc:'Diagrams, charts, and video demonstrations' },
  { id:'auditory',    label:'Auditory', icon:'🎧', desc:'Lectures, discussions, and verbal walkthroughs' },
  { id:'reading',     label:'Reading',  icon:'📖', desc:'Written guides, manuals, and detailed notes' },
  { id:'kinesthetic', label:'Hands-on', icon:'🔧', desc:'Scenarios, simulations, and practical exercises' },
]

export const EXPERIENCE_LEVELS = [
  { id:'beginner',     label:'Beginner',      tag:'New',    desc:'Just starting out, building foundations' },
  { id:'intermediate', label:'Intermediate',  tag:'Some',   desc:'Some experience, expanding knowledge' },
  { id:'advanced',     label:'Advanced',      tag:'Expert', desc:'Deep expertise, looking to go further' },
]

export const GOALS = [
  'Learn a new skill','Pass a certification exam','Advance my career',
  'Train my team','Switch industries','Start my own business',
  'Academic study','Personal enrichment',
]

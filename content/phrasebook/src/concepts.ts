import type { Concept } from '@lyd/schema';

/**
 * The Phrasebook (TDD §4.2, P1): offline concept cards. Feeling first,
 * name second; every card is anchored to a sound you can play RIGHT NOW.
 * Human-reviewed at build time — this file is the entire theory content
 * surface for kid profiles (TDD §5.4 rule 5), so keep it warm, concrete,
 * and free of "you should already know…" energy.
 *
 * ABC examples are one-liners playable by the app's parser: single voice,
 * optional [chord] groups, Q header for tempo.
 */

const abc = (bpm: number, key: string, body: string): string =>
  `X:1\nT:.\nM:none\nL:1/8\nQ:1/4=${bpm}\nK:${key}\n${body}`;

export const CONCEPTS: Concept[] = [
  {
    id: 'major-minor',
    name: 'Major & minor',
    feeling: 'Sun on your face vs. walking home under streetlights.',
    description:
      'Chords and songs mostly come in two moods. One tiny note in the middle of a chord decides which: a hair higher and it beams (major), a hair lower and it turns inward (minor). Nothing else changes — just that one note.',
    heard: 'Birthday songs are major. The sad trombone is minor. Most film scores flip between the two like a light switch.',
    try: 'Play the example, then hum the middle note a little lower yourself and feel the room change.',
    abc: abc(90, 'C', '[CEG]4 z2 [C_EG]4'),
    tags: ['mood', 'chords'],
  },
  {
    id: 'parallel-minor',
    name: 'Parallel minor',
    feeling: 'Your own street, at night.',
    description:
      'Keep the same home note, but swap the sunny scale for its shadowy twin. Everything is still recognizably YOUR tune — it just put on a long coat. Cast Spookify and this is exactly what happens.',
    heard: 'Horror-movie versions of nursery rhymes. That trailer where the pop song plays slow and dark.',
    try: 'Hum a song you love, then try humming it "in the dark" — you will drift toward the parallel minor without knowing the rule.',
    abc: abc(90, 'C', 'C D E F G2 z2 C D _E F G2'),
    tags: ['mood', 'keys', 'spells'],
  },
  {
    id: 'octave',
    name: 'Octave',
    feeling: 'The same person answering in a taller body.',
    description:
      'Sing a note, then sing it again higher until it feels like the SAME note wearing stilts — that landing spot is the octave. Notes an octave apart share a name because our ears hear them as family.',
    heard: '"Somewhere Over the Rainbow" — the first two notes ("Some-where") leap exactly one octave.',
    try: 'Sing "Some-where" and you have sung an octave. Now find it on any instrument: same letter, next one up.',
    abc: abc(80, 'C', 'C4 c4 z2 C2 c2'),
    tags: ['intervals'],
  },
  {
    id: 'fifth',
    name: 'The fifth',
    feeling: 'Two voices standing shoulder to shoulder, unbothered.',
    description:
      'Some pairs of notes are best friends: play them together and they ring without any push or pull. The fifth is the friendliest of all — hollow, strong, and ancient. Rock guitar is built almost entirely on it.',
    heard: 'The opening of the Star Wars theme. Every power chord in every rock song.',
    try: 'Play the two notes of the example together and hold them. Notice how they neither smile nor frown — they just STAND there.',
    abc: abc(85, 'C', 'C4 G4 z2 [CG]6'),
    tags: ['intervals'],
  },
  {
    id: 'third',
    name: 'The third',
    feeling: 'The note that decides how everyone feels today.',
    description:
      'Sitting between a note and its fifth is the third — the mood-setter. Major third: bright. Minor third: tender. When musicians say a chord is happy or sad, they are really talking about this one small resident.',
    heard: 'The difference between a doorbell (major) and a sigh (minor).',
    try: 'Play the example twice and point at the exact moment the mood flips. That was the third moving one small step.',
    abc: abc(85, 'C', '[CE]4 z2 [C_E]4'),
    tags: ['intervals', 'mood'],
  },
  {
    id: 'interval',
    name: 'Interval',
    feeling: 'The size of a jump, measured in feeling.',
    description:
      'The distance between two notes is an interval, and each size has its own flavor: tiny steps feel sneaky, medium hops feel like questions, big leaps feel like flying. Melodies are just journeys made of these jumps.',
    heard: 'The two-note shark warning in Jaws: a tiny, creeping interval. The "Bink-Bong" of a doorbell: a friendly one.',
    try: 'Hum any two notes. Small jump or big leap? Congratulations — you just analyzed an interval by feel.',
    abc: abc(90, 'C', 'C D z C E z C G z C c2'),
    tags: ['intervals'],
  },
  {
    id: 'chord',
    name: 'Chord',
    feeling: 'Notes holding hands.',
    description:
      'Play two or more notes at once and they stop being individuals — they become a chord, a small crowd with a single mood. Most songs are a walk from one chord-crowd to the next.',
    heard: 'The big ringing strum that starts "A Hard Day\'s Night". Any campfire guitar moment.',
    try: 'Press three neighboring white keys with one hand — crunchy! Now spread your fingers out (skip a key between each) — suddenly it agrees with itself.',
    abc: abc(85, 'C', 'C2 E2 G2 [CEG]6'),
    tags: ['chords'],
  },
  {
    id: 'triad',
    name: 'Triad',
    feeling: 'Three notes, perfectly balanced on top of each other.',
    description:
      'The most common chord is a stack of three: a root (the name-giver), a third (the mood), a fifth (the strength). Like a snowman — bottom, middle, top — and almost every chord you have ever heard is a decorated snowman.',
    heard: 'Nearly every chord in nearly every pop, folk, and campfire song.',
    try: 'Sing the example slowly: bottom, middle, top. You are now singing chords by yourself, one resident at a time.',
    abc: abc(80, 'C', 'C2 E2 G2 z2 [CEG]4'),
    tags: ['chords'],
  },
  {
    id: 'seventh-chord',
    name: 'Seventh chord',
    feeling: 'A chord wearing a fancy scarf.',
    description:
      'Stack one more note on a triad and it stops being plain: a seventh chord leans, glows, or smolders depending on which seventh you pick. It is the fastest way to make three chords sound like a jazz club.',
    heard: 'The very last chord of many jazz tunes. The wistful opening of "Something" by The Beatles.',
    try: 'Cast Jazz Hands on any progression and count the scarves.',
    abc: abc(80, 'C', '[CEG]4 z2 [CEGB]4 z2 [CEG_B]4'),
    tags: ['chords', 'spells'],
  },
  {
    id: 'suspended-chord',
    name: 'Suspended chord',
    feeling: 'A held breath. A door ajar.',
    description:
      'Take the mood-note (the third) out of a chord and hang a neighbor in its place — the chord now hovers, refusing to say happy OR sad. That itch to resolve is the whole point: suspension, then relief.',
    heard: 'The shimmering guitar chord that opens "Pinball Wizard". Church organs love this move.',
    try: 'Play the example and DON\'T let the last chord land right away. Feel the itch? Now let it land. That relief has a name: resolution.',
    abc: abc(75, 'C', '[CFG]4 z2 [CEG]6'),
    tags: ['chords', 'spells'],
  },
  {
    id: 'add9',
    name: 'Add-nine',
    feeling: 'Glitter on the chord.',
    description:
      'Add a note one step above the octave and a plain chord gets air and sparkle — dreamier without turning sad. Guitarists and film composers reach for it when "pretty" needs to become "shimmering".',
    heard: 'The chiming chords of "Every Breath You Take". Countless dreamy movie moments.',
    try: 'Cast Float Away on the demo loop and listen for the sparkle landing on the home chord.',
    abc: abc(75, 'C', '[CEG]4 z2 [CEGd]6'),
    tags: ['chords', 'spells'],
  },
  {
    id: 'flat-nine',
    name: 'Flat nine',
    feeling: 'One wrong-colored candle on the cake.',
    description:
      'Put a note just ONE tiny step above the root at the top of a spicy chord and the whole thing curdles deliciously. It is the most haunted single note you can add — villains and film noir live here.',
    heard: 'Tango endings. Spy-movie stingers. The chord the orchestra hits when the detective finds the clue.',
    try: 'Cast Spookify and listen to what happens on the LOUD chord in the middle — that curdle is the flat nine.',
    abc: abc(70, 'C', '[CEG]4 z2 [G_BdF_a]6'),
    tags: ['chords', 'spells'],
  },
  {
    id: 'arpeggio',
    name: 'Arpeggio',
    feeling: 'A chord, told as a story instead of a fact.',
    description:
      'Play a chord one note at a time — rolling up, down, or in loops — and it becomes an arpeggio. Same notes, but now they ripple like water instead of landing like a stamp.',
    heard: 'The intro to "House of the Rising Sun". Harp music. Basically all music boxes.',
    try: 'Take any chord you know and refuse to play its notes at the same time. You are now arpeggiating.',
    abc: abc(95, 'C', 'C E G c G E C2 z2 [CEG]4'),
    tags: ['chords', 'texture'],
  },
  {
    id: 'melody',
    name: 'Melody',
    feeling: 'The one voice you walk away humming.',
    description:
      'Underneath everything a song does, one line of single notes is doing the talking — that is the melody. It is the part your brain kidnaps and replays at 2am.',
    heard: 'Whatever tune is stuck in your head right now. That is a melody, doing its job.',
    try: 'Open the Doodler and hum anything. Watch your melody become dots on lines — a voice, written down.',
    abc: abc(100, 'C', 'E2 D C D E2 E2 E4 D2 D4'),
    tags: ['melody'],
  },
  {
    id: 'bassline',
    name: 'Bassline',
    feeling: 'The footsteps of the song.',
    description:
      'Down at the bottom, the lowest voice walks — sometimes strolling, sometimes strutting. The bassline tells your body how the song moves; that is why you feel it in your chest at concerts.',
    heard: '"Another One Bites the Dust" IS its bassline. Reggae without bass is just a postcard.',
    try: 'Next song you hear, ignore the singer completely and follow only the lowest rumble. Welcome to the underworld.',
    abc: abc(95, 'C', 'C,2 C,2 E,2 G,2 A,2 G,2 E,2 C,2'),
    tags: ['texture'],
  },
  {
    id: 'drone',
    name: 'Drone',
    feeling: 'The ground humming along.',
    description:
      'One note that refuses to move while everything else dances around it. The drone is the oldest trick in music — thousands of years old — and it instantly makes anything sound epic or ancient.',
    heard: 'Bagpipes. The tanpura behind sitar music. The low hum under every epic movie battle.',
    try: 'Cast Giant\'s Footsteps and feel the floor start humming underneath your tune.',
    abc: abc(80, 'C', '[C,G,]2 e2 d2 c2 [C,G,]2 d2 e2 c2'),
    tags: ['texture', 'spells'],
  },
  {
    id: 'key-home-base',
    name: 'Key (home base)',
    feeling: 'The note where the song lives.',
    description:
      'Songs wander, but they wander FROM somewhere and ache to get back. That somewhere is the key — home base. When the analyzer says "home base: C major", it means the song keeps gravitating back to C.',
    heard: 'The last note of nearly any song you can think of: that landing? Home.',
    try: 'Record a song and check its home base badge. Then hum along and stop — notice which note your voice wants to end on.',
    abc: abc(90, 'C', 'C D E F G A B c z2 c2 C4'),
    tags: ['keys'],
  },
  {
    id: 'modulation',
    name: 'Modulation (key change)',
    feeling: 'The song stands on its tiptoes.',
    description:
      'Mid-song, everything slides up and the lights get brighter — the song moved to a new home base. Producers save it for the final chorus because it reliably gives humans goosebumps.',
    heard: 'The last chorus of "Love On Top" by Beyoncé does it FOUR times, each one giddier.',
    try: 'Cast Put a Hat on It twice in a row and feel your loop climb the stairs.',
    abc: abc(100, 'C', 'C E G2 C E G2 z2 D ^F A2 D ^F A2'),
    tags: ['keys', 'spells'],
  },
  {
    id: 'tempo',
    name: 'Tempo',
    feeling: 'The song\'s heartbeat, in a hurry or half asleep.',
    description:
      'Tempo is just speed — how many heartbeats per minute the music has. The same tune at 70 is a lullaby and at 140 is a chase scene. Nothing else has to change.',
    heard: 'Slowed-down versions of pop songs in sad movie trailers. Sped-up chipmunk covers.',
    try: 'Cast Molasses, then Sugar Rush, on the same loop. Same notes. Completely different animal.',
    abc: abc(60, 'C', 'C2 E2 G2 c2 z4 C E G c'),
    tags: ['rhythm', 'spells'],
  },
  {
    id: 'beat',
    name: 'Beat',
    feeling: 'The thing your foot already found.',
    description:
      'Before you decide to, your foot taps — it found the beat: the steady invisible grid every note leans on. You cannot see it, but everyone in the room agrees on where it is. That is kind of magical.',
    heard: 'Clapping at concerts. Windshield wipers that accidentally sync with the radio.',
    try: 'Open Keep Time, press start, and clap WITH it. Then clap exactly BETWEEN its clicks — congratulations, you discovered the off-beat.',
    abc: abc(100, 'C', 'C2 C2 C2 C2 C2 C2 C2 C2'),
    tags: ['rhythm'],
  },
  {
    id: 'meter',
    name: 'Meter',
    feeling: 'How the beats clump: marching or spinning.',
    description:
      'Beats gather in little groups, and the group size changes how music moves your body. Groups of four march and nod. Groups of three spin and sway — that is why waltzes feel like turning.',
    heard: 'Most pop songs: groups of four. "My Favorite Things": groups of three. Try nodding to each — your neck will notice.',
    try: 'In Keep Time, switch from 4/4 classic to 3/4 waltz and let your head follow. Marching → spinning.',
    abc: abc(110, 'C', 'c2 G G c2 G G z2 c2 G c2 G'),
    tags: ['rhythm'],
  },
  {
    id: 'swing',
    name: 'Swing',
    feeling: 'The beat starts skipping instead of walking.',
    description:
      'Take evenly-spaced notes and let every second one arrive fashionably late — suddenly the music bounces. Swing is not written in the notes; it lives in the lateness.',
    heard: 'Any jazz. The theme from The Pink Panther slinks because it swings.',
    try: 'Turn the swing slider up on the metronome and snap your fingers along. Notice you cannot NOT bounce.',
    abc: abc(100, 'C', 'C E G E C E G E'),
    tags: ['rhythm', 'spells'],
  },
  {
    id: 'syncopation',
    name: 'Syncopation',
    feeling: 'A step that lands where you least expect — and you grin.',
    description:
      'Music sets up a steady grid, then deliberately hits BETWEEN the gridlines. That tiny betrayal is syncopation, and it is the main ingredient of funk, reggae, and every groove that makes you move.',
    heard: 'The guitar chops in reggae land exactly off the beat. The horn stabs in "Uptown Funk".',
    try: 'Clap steady beats with one hand. Now sneak claps between them with the other. Your kitchen is now funky.',
    abc: abc(105, 'C', 'z C c2 z C c2 z C c C z C c2'),
    tags: ['rhythm'],
  },
  {
    id: 'rest',
    name: 'Rest (silence)',
    feeling: 'The held breath before the drop.',
    description:
      'Silence is not the absence of music — it is one of its loudest tools. A sudden gap makes everyone lean in. Composers place rests the way comedians place pauses.',
    heard: 'The full-band STOP before the last chorus of so many songs. The gap in "Shave and a Haircut… (wait for it) …two bits."',
    try: 'Hum a tune you know and steal one note from it — replace it with nothing. Feel how big the nothing sounds.',
    abc: abc(95, 'C', 'c2 G2 E2 z4 E2 G2 c4'),
    tags: ['rhythm', 'drama'],
  },
  {
    id: 'dynamics',
    name: 'Dynamics',
    feeling: 'The music leaning in to whisper, then throwing its arms wide.',
    description:
      'Loud and quiet are not just volume settings — they are emotional camera angles. A melody whispered is a secret; the same melody blasted is a declaration. Music breathes by swelling and shrinking.',
    heard: 'The quiet verse / HUGE chorus trick in basically every anthem since 1991.',
    try: 'Hum one note starting from almost-nothing, swell to proud, and fade back out. You just performed a crescendo and a decrescendo.',
    abc: abc(85, 'C', 'E2 E2 E2 E2 e2 e2 e4'),
    tags: ['drama'],
  },
  {
    id: 'motif',
    name: 'Motif',
    feeling: 'A tiny idea that follows you around all day.',
    description:
      'A motif is the smallest musical idea that can survive on its own — four notes, maybe five. Composers repeat it, flip it, stretch it, sneak it into the bass… until it OWNS you.',
    heard: 'Da-da-da-DUM. Beethoven ran an entire symphony on four notes. The Jaws two-note motif ran an entire ocean.',
    try: 'Cast The Echo on a doodle and hear your own idea start following itself around.',
    abc: abc(100, 'C', 'G G G _E2 z2 F F F D2'),
    tags: ['melody', 'spells'],
  },
  {
    id: 'call-response',
    name: 'Call & response',
    feeling: 'The music asks; the music answers.',
    description:
      'One phrase poses a question (it ends hanging in the air), the next one answers (it lands home). Conversation is older than melody — this is just talking, sung.',
    heard: '"Shout" by The Isley Brothers ("You know you make me wanna…" — "SHOUT!"). Church choirs. Sea shanties.',
    try: 'Hum a phrase that ends going UP, like a question. Then answer it going DOWN. You just wrote a conversation.',
    abc: abc(95, 'C', 'C D E G2 z2 G E D C2'),
    tags: ['melody', 'form'],
  },
  {
    id: 'pentatonic',
    name: 'Pentatonic scale',
    feeling: 'Five notes that cannot step on each other\'s toes.',
    description:
      'Drop two troublemaker notes from the scale and the five left over agree with everything. It is the closest thing music has to a "no wrong notes" mode — which is why it shows up on every continent.',
    heard: 'Play only the BLACK keys on a piano: instant folk song. "Amazing Grace" and "My Girl" both live here.',
    try: 'Cast Campfire on a doodle, or noodle on black keys only — impossible to sound bad. Go ahead, try to.',
    abc: abc(95, 'C', 'C D E G A c A G E D C4'),
    tags: ['scales', 'spells'],
  },
  {
    id: 'blue-note',
    name: 'Blue note',
    feeling: 'A note bent until it aches.',
    description:
      'Between the official notes live unofficial ones — and the blues found them. Slide the bright third downward till it drags and you get a note that smiles and hurts at the same time.',
    heard: 'Every blues guitar bend. The growl in gospel and soul singing. B.B. King made a career of ONE note.',
    try: 'Cast Alley Cat and listen for the notes that droop. Then try humming a note and letting it sag on purpose.',
    abc: abc(90, 'C', 'C D _E E G2 z2 C _E C2'),
    tags: ['scales', 'spells'],
  },
  {
    id: 'staccato-legato',
    name: 'Staccato & legato',
    feeling: 'Popcorn vs. honey.',
    description:
      'The same notes can be popped — short, detached, bouncing (staccato) — or poured — smooth, connected, no gaps (legato). It changes the personality of a line without changing a single pitch.',
    heard: 'Pizzicato strings sneaking in cartoons: staccato. A cello sighing in a sad scene: legato.',
    try: 'Hum a phrase like you\'re popping bubbles. Now hum it like you\'re pouring syrup. Same tune, two creatures.',
    abc: abc(100, 'C', 'C z E z G z c z z2 C2E2G2c2'),
    tags: ['texture'],
  },
  {
    id: 'retrograde',
    name: 'Retrograde',
    feeling: 'Your melody, moonwalking.',
    description:
      'Write a melody, then play it back-to-front: last note first. Composers have hidden this mirror-in-time trick in fugues, film scores, and puzzles for centuries. Sometimes it sounds alien; sometimes it accidentally sounds better.',
    heard: 'Bach hid melodies that work forwards AND backwards — simultaneously. Show-off.',
    try: 'Cast Rewind on a doodle. Do you still recognize yourself, walking backwards?',
    abc: abc(95, 'C', 'C D E G c2 z2 c G E D C2'),
    tags: ['transforms', 'spells'],
  },
  {
    id: 'inversion',
    name: 'Inversion',
    feeling: 'Your melody\'s reflection in still water.',
    description:
      'Flip every jump: where the tune went up, go down the same amount. The rhythm keeps your fingerprint, but the shape reflects — familiar and strange at once, like your face in a spoon.',
    heard: 'The Hobbit walking themes and their villains\' themes are often each other\'s reflections. Composers love this mirror.',
    try: 'Cast Mirror Pond on a doodle, then hum along with the reflection. Weirdly possible, right?',
    abc: abc(95, 'C', 'C E G E C2 z2 c A F A c2'),
    tags: ['transforms', 'spells'],
  },
  {
    id: 'augmentation',
    name: 'Augmentation',
    feeling: 'The same thought, spoken slowly and seriously.',
    description:
      'Stretch every note to double its length and a quick tune becomes a solemn one. Composers use it to make a playful motif suddenly feel like it grew up and got a job as a monument.',
    heard: 'Movie scores do this when the hero\'s theme returns at the funeral — same notes, twice as long, ten times as heavy.',
    try: 'Cast Molasses and listen to your idea become important.',
    abc: abc(100, 'C', 'C D E G2 z2 C2 D2 E2 G4'),
    tags: ['transforms', 'spells'],
  },
  {
    id: 'diminution',
    name: 'Diminution',
    feeling: 'The same thought, blurted excitedly.',
    description:
      'Halve every note and the tune sprints. Diminution turns a stately theme into a giggle — which is why cartoons use it when the dignified character starts running.',
    heard: 'Cartoon chase scenes quoting the slow theme at chipmunk speed.',
    try: 'Cast Sugar Rush and count how much sooner your idea finishes. Where did the leftover time go?',
    abc: abc(100, 'C', 'C2 D2 E2 G4 z2 C D E G2'),
    tags: ['transforms', 'spells'],
  },
  {
    id: 'cadence',
    name: 'Cadence',
    feeling: 'The song walking in the front door and taking off its shoes.',
    description:
      'The end of a musical sentence: tension gathers, then lands. A full landing feels like "The End"; a soft landing feels like a comma. Once you hear cadences, you can feel a song\'s punctuation everywhere.',
    heard: 'The "amen" at the end of hymns is a cadence so famous it has its own name.',
    try: 'Play the example and stop before the final chord. Sit in the itch. Then play the landing and exhale.',
    abc: abc(80, 'C', '[FAc]4 [GBd]4 [CEG]8'),
    tags: ['form', 'drama'],
  },
];

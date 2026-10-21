// The holes' and worlds' texts in the chosen language. Imported first by main.js,
// so it runs before anything reads a name, a route or a sign.
import { LEVELS } from './levels.js';
import { WORLDS } from './round.js';
import { translateData } from './i18n.js';

translateData(LEVELS);
translateData(WORLDS);

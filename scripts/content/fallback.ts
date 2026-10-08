import type { Lang } from "./build";

/**
 * Hand-written content used only when a download fails, so a build never ends with empty lessons.
 * Deliberately small: `npm run validate:content` still demands the full corpora.
 */
export const FALLBACK: Record<Lang, { words: string[]; sentences: string[]; passages: string[] }> =
  {
    de: {
      words: (
        "und der die das ist nicht ich du er sie es wir ihr ein eine zu in mit auf für von den dem des " +
        "auch sich so wie wenn aber noch nur schon mehr sehr gut Haus Tag Jahr Zeit Mann Frau Kind Welt " +
        "Hand Auge Weg Stadt Land Wasser Brot Buch Tisch Stuhl Fenster Tür Straße Garten Baum Blume Sonne " +
        "Mond Stern Wind Regen Schnee Berg Fluss See Meer Fisch Vogel Hund Katze Pferd gehen kommen sehen " +
        "machen sagen geben nehmen finden denken wissen lesen schreiben spielen laufen essen trinken schlafen " +
        "groß klein alt neu schön schnell langsam laut leise hell dunkel warm kalt früh spät heute morgen " +
        "gestern immer nie oft hier dort oben unten links rechts über unter vor nach bei durch gegen ohne"
      ).split(" "),
      sentences: [
        "Der Hund läuft schnell durch den Garten.",
        "Heute scheint die Sonne über der ganzen Stadt.",
        "Wir trinken am Morgen einen warmen Tee.",
        "Die Kinder spielen draußen im Schnee.",
        "Ich lese gern ein gutes Buch am Abend.",
        "Das Wasser im See ist heute sehr kalt.",
        "Mein Bruder wohnt in einem kleinen Haus am Fluss.",
        "Im Herbst fallen die Blätter von den Bäumen.",
        "Sie geht jeden Tag zu Fuß zur Arbeit.",
        "Der Zug nach Wien fährt um acht Uhr ab.",
        "Wir haben gestern einen langen Spaziergang gemacht.",
        "Die Katze schläft auf dem warmen Fensterbrett.",
        "Er schreibt einen Brief an seine alte Freundin.",
        "Im Sommer fahren wir gern an das Meer.",
        "Der Bäcker backt jeden Morgen frisches Brot.",
      ],
      passages: [
        "Am Morgen stand sie früh auf und öffnete das Fenster. Die Luft war kühl und klar, und über den Dächern der Stadt zog langsam die Sonne herauf. Sie kochte sich einen Kaffee, setzte sich an den Tisch und las die Zeitung, während draußen die ersten Autos vorbeifuhren.",
        "Der Weg führte durch einen dichten Wald, in dem es still war und nach feuchter Erde roch. Nur manchmal knackte ein Ast, oder ein Vogel rief aus der Höhe. Nach einer Stunde erreichten sie eine kleine Lichtung, auf der sie rasten wollten, bevor es weiter bergauf ging.",
        "Wer schreiben lernen will, muss vor allem üben, und zwar jeden Tag ein wenig. Am Anfang fühlt es sich langsam und mühsam an, doch mit der Zeit finden die Finger ihren Weg von allein. Wichtig ist, ruhig zu bleiben und auf die Genauigkeit zu achten, denn Tempo kommt später ganz von selbst.",
      ],
    },
    en: {
      words: (
        "the of and to a in is it you that he was for on are with as I his they be at one have this from " +
        "or had by not word but what some we can out other were all there when up use your how said an each " +
        "she which do their time if will way about many then them write would like so these her long make " +
        "thing see him two has look more day could go come did number sound no most people my over know water " +
        "than call first who may down side been now find any new work part take get place made live where after " +
        "back little only round man year came show every good me give our under name very through just form " +
        "house garden river window table chair bread book street tree flower sun moon star wind rain snow"
      ).split(" "),
      sentences: [
        "The dog runs quickly through the garden.",
        "Today the sun is shining over the whole town.",
        "We drink a warm cup of tea in the morning.",
        "The children are playing outside in the snow.",
        "I like to read a good book in the evening.",
        "The water in the lake is very cold today.",
        "My brother lives in a small house by the river.",
        "In autumn the leaves fall from the trees.",
        "She walks to work every single day.",
        "The train to the city leaves at eight o'clock.",
        "Yesterday we took a long walk along the shore.",
        "The cat is sleeping on the warm window sill.",
        "He is writing a letter to his old friend.",
        "In summer we like to drive to the sea.",
        "The baker bakes fresh bread every morning.",
      ],
      passages: [
        "She got up early and opened the window. The air was cool and clear, and the sun was slowly climbing over the roofs of the town. She made herself a coffee, sat down at the table and read the paper while the first cars drove past outside.",
        "The path led through a dense forest where it was quiet and smelled of damp earth. Now and then a branch cracked, or a bird called from above. After an hour they reached a small clearing where they meant to rest before the road turned uphill again.",
        "Anyone who wants to learn to type has to practise, a little every day. At first it feels slow and tiring, but in time the fingers find their own way. The important thing is to stay calm and watch your accuracy, because speed will come by itself later on.",
      ],
    },
  };

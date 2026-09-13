/* ============ THE PINNED FILMS ============
   MACHINE WRITTEN. Do not hand-edit: tools/films-add.mjs regenerates this file
   whole from tools/films.candidates.json, and a hand edit is lost on the next
   run and unprovable in the meantime.

   Every title and channel below came back from YouTube's oEmbed endpoint in
   the run that wrote this file. Nobody typed them. They are recorded so that
   tools/check-films.mjs can ask YouTube again later and notice when an id
   still resolves but now points at something else, which is the failure a bare
   is-it-alive check cannot see.

   Titles are escaped to pure ASCII. That is not decoration: the published tree
   counts em dashes against a baseline with very little headroom, and one
   borrowed title could break it. The escaped form is byte-identical in both
   trees and its string VALUE still equals YouTube's title exactly.

   Keyed sec + row, where row is slugify() of a lesson title in that section of
   COFFEE_STUDY. tools/check.mjs closes that loop, so a lesson renamed in a
   later pass fails the build rather than silently dropping its film.
   ============ */

const COFFEE_FILMS = [
  {sec:"machine",row:"backflushing-and-the-cleaning-you-cannot-skip",id:"5LEd0XoFVRg",title:"How and Why to Backflush Your Espresso Machine",channel:"Whole Latte Love",watchFor:"The blind basket going in, and what comes out of the drain on the first cycle against the last. That colour is the answer to why a skipped week tastes like it does."},
  {sec:"machine",row:"the-grinder-needs-cleaning-too-and-differently",id:"jmKTA-5xt8o",title:"Is Your Grinder Ruining Your Coffee? Essential Cleaning & Maintenance Tips for Grinders",channel:"Artisti Coffee Roasters.",watchFor:"How much old coffee comes out of a grinder that looked clean, and that nothing wet ever goes near the burrs. That is the difference from every other cleaning job on the bar."},
  {sec:"shot",row:"distribution-and-tamping",id:"kJbQuGwNGMM",title:"How to do WDT puck prep correctly",channel:"Decent Espresso",watchFor:"The needles breaking clumps all the way to the bottom of the basket rather than raking the surface. Watch the depth, because a level top over a clumped bed is the failure this fixes."},
  {sec:"shot",row:"channelling-and-how-to-see-it",id:"rPg1P8On-HM",title:"Diagnosing channeling using a bottomless portafilter",channel:"Understanding Coffee",watchFor:"The underside of a bottomless basket: the moment a jet sprays sideways instead of the streams knitting into one. That spray is the thing you cannot see through a spouted portafilter."},
  {sec:"shot",row:"sour-and-bitter-are-the-two-directions-of-extraction",id:"5EmzD0Pzvug",title:"Understanding Over & Under Extraction | The Fundamentals Of Espresso!",channel:"Dylan\u2019s Home Espresso Bar",watchFor:"The shots run side by side and tasted out loud. Hearing somebody name sour against bitter on two cups from one bag is the part a written description cannot give you."},
  {sec:"shot",row:"dialling-in-as-a-procedure",id:"W2HtvGv-Lk4",title:"How to Dial In Espresso - Fundamentals",channel:"David Anderson Show",watchFor:"One variable moving at a time, and the scale staying on the drip tray the whole way through. The discipline is the lesson here, not the numbers."},
  {sec:"milk",row:"what-steaming-actually-does-to-milk",id:"cRsT4WhFTHo",title:"How to Steam Milk Like a Barista | Microfoam, Latte Art & Common Mistakes Explained",channel:"Smalltown Coffee Roasters",watchFor:"The common mistakes section, where bad milk is shown beside good. Seeing froth and microfoam in the same pitcher is worth more than any description of either."},
  {sec:"milk",row:"stretch-then-spin",id:"TzsdPlaYHks",title:"Steaming Perfect Milk on Your Espresso Machine (Barista Guide)",channel:"Artisti Coffee Roasters.",watchFor:"Where the tip sits during the air phase against the spin phase, and the pitcher dropping as the milk rises to hold that depth. Listen for the change in sound between the two."},
  {sec:"milk",row:"the-vortex-and-what-it-is-for",id:"QP8vsFTXTmc",title:"Milk Steaming for Beginners: The ONE Technique for Perfect Microfoam (Vortex Method)",channel:"Dero_De_Barista",watchFor:"The whole body of milk turning rather than the surface sputtering. That is the difference between folding bubbles under and just making them."},
  {sec:"milk",row:"the-heart-is-floated-not-drawn",id:"SiefJJv-Qho",title:"Latte Art For Beginners: How To Pour Heart (Latte Art Tutorial) \ud83d\udda4",channel:"European Coffee Trip",watchFor:"The pitcher dropping close to the surface before any white appears, and the cut straight through at the end. Nothing is drawn; a circle is floated and then split."},
  {sec:"milk",row:"rosetta-and-tulip",id:"UkbLsAzhNBg",title:"Latte Art Rosetta: A Step by Step Guide",channel:"Seven Miles Coffee Roasters",watchFor:"The wiggle starting while the pitcher is still moving back, and the drag forward through the middle at the end. Watch the wrist and the cup angle together."},
  {sec:"milk",row:"alternative-milks-and-what-they-do-differently",id:"oKLN13Tcyxc",title:"DAMN FINE TUTORIAL - Steaming & Pouring Alternative Milks",channel:"The Real Sprometheus",watchFor:"The same wand and the same pitcher across several milks, and how differently each one behaves. The comparison is the point, not any single technique."},
];

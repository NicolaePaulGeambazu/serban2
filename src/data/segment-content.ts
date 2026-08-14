// Per-segment editorial overrides for the sub-ranking pages
// (src/pages/clasament/[cat]/[seg].astro). Keyed by `${catId}/${segmentSlug}`.
//
// The segment page falls back to the parent category's guide / comparison / faq
// when a key is missing here, so every subpage stays rich. Where a segment IS
// listed, its own copy replaces the shared text — this is what keeps sibling
// subpages (gaz vs cărbune, JBL vs Sony, …) from being near-duplicates.
//
// Editorial framing only: describe features from specs and how people use the
// product. Never claim we lab-tested anything.

export type SegGuideItem = { h3: string; body: string; callout?: string };
export type SegComparison = {
  title: string;
  intro?: string;
  aLabel: string;
  bLabel: string;
  rows: { criteriu: string; a: string; b: string }[];
  verdict?: string;
};
export type SegFaqItem = { q: string; a: string };
export type SegmentContent = {
  intro?: string;
  guide?: SegGuideItem[];
  comparison?: SegComparison | null; // null hides the category comparison entirely
  faq?: SegFaqItem[];
};

export const SEGMENT_CONTENT: Record<string, SegmentContent> = {
  // ─────────────────────────── GRĂTARE ───────────────────────────
  'gratare/gaz': {
    intro:
      'Grătarele pe gaz sunt cele mai comode: pornesc în câteva minute, țin temperatura constantă și se curăță ușor, așa că rămân alegerea firească dacă gătești des, inclusiv în timpul săptămânii. Am filtrat topul doar la modelele pe gaz și le-am ordonat după numărul de arzătoare, suprafața de gătit și dotările utile, de la capac cu termometru la arzător lateral și arzător infraroșu pentru rumenire rapidă.',
    guide: [
      {
        h3: 'Câte arzătoare îți trebuie',
        body: 'Numărul de arzătoare îți dă zone de gătit independente: cu 3+1 acoperi confortabil o familie de 4, iar cu 4+1 sau 5 poți ține o zonă la foc mic pentru gătit indirect și una la foc iute pentru rumenire. Mai multe arzătoare înseamnă și mai multă putere totală (kW), deci încălzire mai rapidă a plăcii.',
        callout: 'Pentru 4 persoane, 3+1 arzătoare e suficient; treci la 4+1 sau 5 doar dacă gătești des pentru grupuri mari.',
      },
      {
        h3: 'Capac cu termometru și gătit indirect',
        body: 'Un capac cu termometru transformă grătarul într-un mic cuptor: aprinzi doar arzătoarele de pe o parte, pui carnea pe partea rece și gătești cu capacul închis, la temperatură controlată. E aproape obligatoriu pentru bucăți mari (pui întreg, ceafă, coaste) care ar arde la foc direct.',
      },
      {
        h3: 'Arzător lateral și infraroșu',
        body: 'Arzătorul lateral e util pentru o oală de sos sau garnitură fără să părăsești grătarul. Arzătorul infraroșu (searing) atinge temperaturi mari foarte repede și e ideal pentru a sigila fripturile, cu acea crustă rumenită pe care focul obișnuit o face mai greu.',
      },
    ],
    comparison: {
      title: '3+1 arzătoare vs. 5 arzătoare: cât îți trebuie?',
      aLabel: '3+1 arzătoare',
      bLabel: '5 arzătoare',
      rows: [
        { criteriu: 'Familie potrivită', a: '2–4 persoane', b: '5+ persoane, grupuri' },
        { criteriu: 'Zone de temperatură', a: 'Direct + indirect simplu', b: 'Mai multe zone simultan' },
        { criteriu: 'Putere / încălzire', a: 'Suficientă, mai economică', b: 'Mai multă putere, mai rapidă' },
        { criteriu: 'Spațiu necesar', a: 'Compact, merge pe balcon', b: 'Ocupă mai mult, pentru curte' },
      ],
      verdict:
        'Pentru gătitul de zi cu zi, 3+1 arzătoare e alegerea echilibrată. Treci la 5 arzătoare doar dacă gătești frecvent pentru mulți sau vrei mai multe zone de temperatură în paralel.',
    },
    faq: [
      { q: 'Câte arzătoare are un grătar pe gaz bun?', a: 'Pentru o familie, 3+1 arzătoare acoperă majoritatea situațiilor și permite și gătit indirect. 4+1 sau 5 arzătoare au sens dacă gătești des pentru grupuri sau vrei mai multe zone de temperatură deodată.' },
      { q: 'Pot găti indirect pe un grătar pe gaz?', a: 'Da. Aprinzi doar arzătoarele de pe o parte, așezi carnea pe partea fără flacără și închizi capacul. Așa gătești bucăți mari uniform, fără să le arzi la exterior, exact ca într-un cuptor.' },
      { q: 'Ce butelie și regulator folosește?', a: 'Modelele funcționează pe GPL (butelie de aragaz), iar multe includ deja furtunul și regulatorul. Verifică în descriere dacă sunt incluse și presiunea recomandată de producător.' },
      { q: 'Cât de greu se curăță un grătar pe gaz?', a: 'E cel mai ușor de întreținut dintre tipuri: nu ai cenușă, iar tava de scurgere a grăsimii și grilele se curăță rapid. Un periaj după fiecare folosire și golirea periodică a tăvii sunt de obicei suficiente.' },
    ],
  },
  'gratare/carbune': {
    intro:
      'Grătarul pe cărbune cere puțină răbdare la aprindere, dar răsplătește cu aroma autentică de fum și cu temperaturi mari pentru o crustă bună la fripturi. Am filtrat topul doar la modelele pe cărbune și le-am ordonat după construcție, suprafața de gătit și sistemul de control al aerului, care face diferența între un foc greu de stăpânit și unul stabil.',
    guide: [
      {
        h3: 'Aroma de fum și temperatura',
        body: 'Cărbunele atinge temperaturi mai mari decât gazul și dă acea aromă de fum pe care mulți o caută. În schimb cere timp de aprindere și puțină experiență ca să reglezi focul, motiv pentru care un coș de aprindere și cărbune de calitate contează la fel de mult ca grătarul în sine.',
      },
      {
        h3: 'Tiraj și ventilație = control',
        body: 'Clapetele de aer (jos și la capac) controlează cât oxigen ajunge la jar, deci temperatura. Modelele tip kettle cu tiraj reglabil îți permit să treci de la foc iute la gătit lent cu capacul închis, aproape ca la un mini-cuptor cu fum.',
        callout: 'Capacul cu clapete de ventilație e ce transformă un grătar simplu într-unul cu care poți găti și indirect.',
      },
      {
        h3: 'Grile: fontă emailată vs. inox',
        body: 'Fonta emailată reține bine căldura și lasă urme frumoase de rumenire, dar cere atenție la umezeală ca să nu ruginească pe margini. Inoxul e mai ușor de curățat și mai iertător la întreținere, chiar dacă marchează puțin mai discret carnea.',
      },
    ],
    comparison: {
      title: 'Kettle rotund vs. grătar dreptunghiular pe cărbune',
      aLabel: 'Kettle rotund',
      bLabel: 'Dreptunghiular',
      rows: [
        { criteriu: 'Control temperatură', a: 'Foarte bun, cu clapete', b: 'Variabil, depinde de model' },
        { criteriu: 'Gătit indirect', a: 'Ușor, cu capacul', b: 'Posibil, mai puțin precis' },
        { criteriu: 'Suprafață utilă', a: 'Rotundă, compactă', b: 'Mai lată, pentru mese laterale' },
        { criteriu: 'Potrivit pentru', a: 'Fripturi, gătit lent', b: 'Multe porții deodată' },
      ],
      verdict:
        'Un kettle cu tiraj reglabil îți dă cel mai bun control și poate găti și indirect. Un grătar dreptunghiular are mai mult spațiu și mese laterale, util când prepari multe porții deodată.',
    },
    faq: [
      { q: 'Cum aprind cărbunele fără lichid de aprindere?', a: 'Cel mai simplu e cu un coș de aprindere: pui hârtie dedesubt și cărbune deasupra, iar în 15–20 de minute ai jar gata de folosit, fără gust de chimicale. E metoda preferată de majoritatea pasionaților.' },
      { q: 'Cât cărbune folosesc?', a: 'Depinde de suprafață și de cât gătești, dar un strat uniform care acoperă vatra e un punct de plecare bun. Unele modele includ un bol de măsurare pentru brichete tocmai ca să dozezi constant.' },
      { q: 'Pot găti indirect pe cărbune?', a: 'Da, dacă grătarul are capac cu clapete de aer. Aduni jarul pe o parte, pui carnea pe partea liberă și închizi capacul; clapetele reglează temperatura pentru bucăți mari sau afumare ușoară.' },
      { q: 'Cum curăț cenușa?', a: 'După ce s-a răcit complet, golești tava de cenușă (multe kettle au un colector dedesubt) și periezi grilele. Curățarea e ceva mai laborioasă decât la gaz, dar rapidă dacă o faci după fiecare folosire.' },
    ],
  },
  'gratare/plancha': {
    intro:
      'Plancha (placa netedă) și grătarele tip disc gătesc pe o suprafață continuă, așa că poți prepara legume tăiate mărunt, fructe de mare, ouă sau clătite, lucruri care ar cădea printre grilele clasice. Am filtrat topul la modelele cu placă și le-am ordonat după suprafața de gătit, material și cât de uniform distribuie căldura.',
    guide: [
      {
        h3: 'Ce gătești cel mai bine pe plancha',
        body: 'Placa netedă e imbatabilă la legume tăiate mărunt, ciuperci, fructe de mare, ouă, clătite sau un mic dejun complet. Contactul direct cu suprafața fierbinte rumenește frumos și păstrează sucul, iar nimic nu cade în foc.',
      },
      {
        h3: 'Fontă emailată vs. oțel carbon',
        body: 'Fonta emailată reține mult căldura și e ușor de întreținut. Oțelul carbon se încălzește rapid și, odată sezonat (uns și încins), capătă un strat natural antiaderent, dar cere puțină grijă ca să nu ruginească.',
        callout: 'Distribuția uniformă a căldurii contează mai mult decât temperatura maximă: o placă groasă gătește egal, fără puncte reci.',
      },
      {
        h3: 'Plancha pe gaz vs. disc pe lemne',
        body: 'Versiunile pe gaz pornesc repede și reglează temperatura din buton, ideale pentru gătit des. Discurile pe lemne aduc aroma focului deschis și un aer festiv, dar cer timp de aprindere și un pic mai multă atenție la reglaj.',
      },
    ],
    comparison: {
      title: 'Plancha vs. grile clasice: care ți se potrivește',
      aLabel: 'Plancha / disc',
      bLabel: 'Grile clasice',
      rows: [
        { criteriu: 'Legume și fructe de mare', a: 'Excelent, nu cad în foc', b: 'Dificil, cad printre grile' },
        { criteriu: 'Urme de grătar pe carne', a: 'Rumenire uniformă', b: 'Dungi clasice de searing' },
        { criteriu: 'Mic dejun (ouă, clătite)', a: 'Da', b: 'Nu' },
        { criteriu: 'Aromă de fum', a: 'Mai discretă', b: 'Mai pronunțată' },
      ],
      verdict:
        'Plancha e alegerea versatilă pentru legume, fructe de mare și mic dejun. Dacă vrei dungile clasice și aroma pronunțată de fum, grilele rămân mai potrivite, iar multe modele hibrid îți dau ambele.',
    },
    faq: [
      { q: 'Prin ce diferă plancha de un grătar obișnuit?', a: 'Plancha gătește pe o placă netedă continuă, nu pe grile. Așa poți prepara și alimente mici sau lichide (legume tăiate, ouă, fructe de mare) care ar cădea printre grile, cu rumenire uniformă pe toată suprafața.' },
      { q: 'Se lipește mâncarea de placă?', a: 'Cu puțin ulei și placa bine încinsă, alimentele se desprind ușor. Plăcile din oțel carbon devin natural antiaderente după câteva folosiri, pe măsură ce se sezonează.' },
      { q: 'Pot găti carne pe plancha?', a: 'Da, se rumenește frumos și uniform. Nu vei avea dungile clasice de grătar, dar crusta și sucul rămân foarte bune, mai ales la burgeri, piept de pui sau fripturi subțiri.' },
      { q: 'Cum întrețin placa?', a: 'O cureți cât e caldă, cu apă și o spatulă, apoi o usuci și, la oțel carbon, o ungi ușor înainte de depozitare. Așa eviți rugina și păstrezi stratul antiaderent natural.' },
    ],
  },
  'gratare/kamado': {
    intro:
      'Kamado-ul din ceramică e cel mai versatil grătar: pereții groși rețin căldura, iar controlul aerului îți dă un interval larg de temperatură, de la gătit lent și afumare până la pizza la foc iute. Am filtrat topul la modelele kamado și le-am ordonat după diametrul de gătit, calitatea ceramicii și accesoriile incluse.',
    guide: [
      {
        h3: 'De ce ceramica face diferența',
        body: 'Pereții groși de ceramică izolează excelent, așa că un kamado consumă mai puțin cărbune și ține temperatura ore întregi. Aceeași ceramică radiază căldura uniform, motiv pentru care kamado-ul e la fel de bun la fripturi rapide și la gătit lent, pe aceeași vatră de jar.',
      },
      {
        h3: 'Controlul temperaturii pe interval larg',
        body: 'Combinația dintre clapeta de jos și cea de sus reglează fin oxigenul, deci temperatura, de la ~110°C pentru afumare până la peste 350–400°C pentru pizza. Odată stabilizat, kamado-ul ține setarea foarte constant, fără să-l tot supraveghezi.',
        callout: 'Secretul kamado-ului e răbdarea la reglaj: deschizi clapetele treptat și lași temperatura să se stabilizeze înainte să pui mâncarea.',
      },
      {
        h3: 'Accesorii: deflector și piatră de pizza',
        body: 'Un deflector de căldură transformă kamado-ul într-un cuptor pentru gătit indirect și afumare, iar piatra de pizza folosește temperaturile mari pentru un blat crocant. Multe modele includ deja grătare din fontă și aluminiu pentru situații diferite.',
      },
    ],
    comparison: {
      title: 'Kamado vs. grătar clasic pe cărbune',
      aLabel: 'Kamado ceramic',
      bLabel: 'Cărbune clasic',
      rows: [
        { criteriu: 'Retenția căldurii', a: 'Foarte bună, ore întregi', b: 'Moderată, se răcește mai repede' },
        { criteriu: 'Consum de cărbune', a: 'Redus', b: 'Mai mare' },
        { criteriu: 'Versatilitate', a: 'Grill, afumare, slow cooking, pizza', b: 'Mai ales grill' },
        { criteriu: 'Preț de pornire', a: 'Mai mare', b: 'Accesibil' },
      ],
      verdict:
        'Kamado-ul e investiția pentru cine vrea un singur aparat la toate: grill, afumare, gătit lent și pizza, cu consum mic de cărbune. Un grătar clasic pe cărbune costă mai puțin și e potrivit dacă gătești mai ales la foc direct.',
    },
    faq: [
      { q: 'Ce este un grătar kamado?', a: 'E un grătar din ceramică groasă, în formă de ou, care reține foarte bine căldura. Cu el poți face grill la foc iute, afumare, gătit lent și chiar pizza, controlând temperatura din clapetele de aer.' },
      { q: 'Consumă mult cărbune?', a: 'Nu. Datorită izolației ceramice, un kamado ține temperatura ore întregi cu relativ puțin cărbune, fiind mai economic decât un grătar deschis pentru sesiuni lungi de gătit.' },
      { q: 'Pot face pizza și afumătură în același kamado?', a: 'Da, e chiar punctul lui forte. Cu un deflector de căldură și temperatură joasă faci afumare și gătit lent, iar cu o piatră și temperatură mare coci pizza cu blat crocant.' },
      { q: 'Rezistă afară pe tot parcursul anului?', a: 'Ceramica e rezistentă, dar merită protejată de îngheț și lovituri cu o husă. Evită șocurile termice bruște (nu turna apă rece pe ceramica fierbinte) ca să previi fisurile.' },
    ],
  },

  // ─────────────────────────── SOUNDBAR ───────────────────────────
  'soundbar/2-1': {
    intro:
      'O bară 2.1 adaugă un subwoofer wireless la cele două canale principale, așa că primești bas real și dialog clar fără să umpli camera cu boxe. E cel mai simplu și eficient upgrade față de sunetul plat al televizorului, potrivit pentru camere mici și medii. Am filtrat topul la sistemele 2.1 și le-am ordonat după calitatea sunetului, bas, dotări și conectivitate.',
    guide: [
      {
        h3: 'Ce înseamnă „2.1"',
        body: 'Primul număr (2) sunt canalele principale, stânga și dreapta, iar „.1" e subwooferul care se ocupă de bas. E configurația care rezolvă cele mai comune probleme, dialog subțire și lipsă de bas, fără complicații de montaj.',
      },
      {
        h3: 'Subwoofer wireless: unde îl pui',
        body: 'Aproape toate barele 2.1 bune vin cu subwoofer wireless: se conectează singur la bară și îl așezi oriunde lângă o priză. Un colț al camerei întărește basul, dar merită să experimentezi cu poziția pentru cel mai curat rezultat.',
        callout: 'Un subwoofer wireless nu înseamnă fără cablu deloc, ci fără cablu până la bară: tot are nevoie de alimentare la priză.',
      },
      {
        h3: 'Conectare: HDMI eARC vs. optic',
        body: 'HDMI eARC e cea mai bună legătură: trece sunet de calitate și e controlat de telecomanda televizorului. Opticul e o alternativă bună dacă televizorul nu are eARC, iar Bluetooth-ul rămâne util pentru muzică de pe telefon.',
      },
    ],
    comparison: {
      title: '2.1 vs. 3.1: merită canalul central?',
      aLabel: 'Soundbar 2.1',
      bLabel: 'Soundbar 3.1',
      rows: [
        { criteriu: 'Claritatea dialogului', a: 'Bună', b: 'Mai bună (canal central dedicat)' },
        { criteriu: 'Bas', a: 'Subwoofer dedicat', b: 'Subwoofer dedicat' },
        { criteriu: 'Camere potrivite', a: 'Mici și medii', b: 'Medii' },
        { criteriu: 'Preț', a: 'Mai accesibil', b: 'Ceva mai mare' },
      ],
      verdict:
        'Pentru majoritatea camerelor, o bară 2.1 bună e suficientă și cel mai bun raport preț-rezultat. Treci la 3.1 dacă urmărești mult film și vrei dialogul cât mai limpede, datorită canalului central dedicat.',
    },
    faq: [
      { q: 'Ce diferență e între 2.0 și 2.1?', a: 'La 2.0 basul e produs tot de bară, iar la 2.1 ai un subwoofer separat care coboară mult mai jos. Diferența se simte clar la filme și muzică, unde 2.1 adaugă impact și profunzime.' },
      { q: 'E destul un 2.1 pentru filme?', a: 'Pentru camere mici și medii, da. O bară 2.1 bună dă dialog clar și bas solid; efectele de surround „din spate" apar doar la sistemele 5.1 cu sateliți, dar nu toată lumea are unde-i pune.' },
      { q: 'Subwooferul e cu adevărat wireless?', a: 'Se conectează wireless la bară, deci nu tragi cablu între ele. Are totuși nevoie de alimentare, așa că îl pui lângă o priză, oriunde în cameră.' },
      { q: 'Are Dolby Atmos o bară 2.1?', a: 'Unele modele 2.1 oferă Atmos virtual, care simulează înălțimea prin procesare, fără difuzoare orientate în sus. Efectul e mai subtil decât la sistemele cu canale .2 reale, dar adaugă spațialitate.' },
    ],
  },
  'soundbar/5-1': {
    intro:
      'Un sistem 5.1 adaugă sateliți în spate față de o bară obișnuită, așa că primești surround real: efectele se mișcă în jurul tău, nu doar în fața ta. E configurația de home cinema pentru sufragerii mari, unde ai unde așeza boxele din spate. Am filtrat topul la sistemele 5.1 și le-am ordonat după sunet, dotări de cinema și conectivitate.',
    guide: [
      {
        h3: '5.1 real vs. surround virtual',
        body: 'Un 5.1 „real" folosește sateliți fizici în spate pentru surround, în timp ce barele care simulează 5.1 procesează sunetul dintr-un singur corp. Surroundul real e mai convingător la filme și jocuri, dar cere spațiu și, uneori, câte un cablu până la sateliți.',
      },
      {
        h3: 'Unde așezi sateliții',
        body: 'Ideal, sateliții stau ușor în spatele locului de vizionare, la înălțimea urechilor. Dacă nu ai unde să-i pui, un sistem 5.1 nu-și arată valoarea, iar o bară 3.1 bună va suna mai coerent în camera ta.',
        callout: 'Nu lua un 5.1 dacă nu ai loc pentru sateliții din spate; o bară 3.1 bine plasată va suna mai bine decât un 5.1 înghesuit.',
      },
      {
        h3: 'Kit wireless vs. cablu la sateliți',
        body: 'Multe sisteme includ un kit wireless: sateliții se leagă la un receptor, nu direct cu fir lung până la bară. Verifică totuși, pentru că unele modele accesibile cer cablu de la sateliți la subwoofer, ceea ce influențează așezarea în cameră.',
      },
    ],
    comparison: {
      title: '5.1 cu sateliți vs. 3.1 fără',
      aLabel: 'Sistem 5.1',
      bLabel: 'Bară 3.1',
      rows: [
        { criteriu: 'Surround real', a: 'Da, din spate', b: 'Nu, doar frontal' },
        { criteriu: 'Spațiu necesar', a: 'Mare, loc pentru sateliți', b: 'Redus' },
        { criteriu: 'Montaj', a: 'Mai laborios', b: 'Simplu, o piesă' },
        { criteriu: 'Cameră potrivită', a: 'Sufragerie mare', b: 'Cameră mică-medie' },
      ],
      verdict:
        'Dacă ai sufragerie mare și vrei experiența completă de cinema, un 5.1 cu sateliți răsplătește fiecare seară de film. Dacă spațiul e limitat, o bară 3.1 bună îți dă dialog clar și bas solid, fără bătaie de cap la montaj.',
    },
    faq: [
      { q: 'Câte difuzoare are un sistem 5.1?', a: 'Cinci canale principale (stânga, dreapta, central și doi sateliți de surround) plus un subwoofer pentru bas. Cei doi sateliți din spate sunt cei care creează efectul de surround real.' },
      { q: 'Am nevoie de mult spațiu?', a: 'Da, un 5.1 dă tot ce e mai bun când poți așeza sateliții în spatele locului de vizionare. În camere mici sau fără loc pentru boxele din spate, o bară 3.1 e adesea alegerea mai bună.' },
      { q: 'Ce diferență e între 5.1 și 5.1.2?', a: 'Cifra „.2" adaugă două canale de înălțime (difuzoare orientate în sus) pentru Dolby Atmos, care trimit sunetul spre tavan pentru senzația de deasupra. Un 5.1 clasic acoperă surroundul, dar nu și înălțimea.' },
      { q: 'Pot folosi sistemul și fără sateliți?', a: 'La multe modele, da: bara și subwooferul funcționează separat, iar sateliții îi adaugi când ai unde. Așa poți începe compact și extinde la surround complet mai târziu.' },
    ],
  },
  'soundbar/jbl': {
    intro:
      'Gama JBL Bar merge de la modele compacte 2.0 și 2.1 Deep Bass până la sisteme mari cu sateliți detașabili care se încarcă chiar în bară și devin surround wireless. E o linie cunoscută pentru bas generos și pentru soluția inteligentă de sateliți. Am filtrat topul la modelele JBL și le-am ordonat după sunet, dotări și conectivitate.',
    guide: [
      {
        h3: 'Gama JBL Bar pe scurt',
        body: 'La bază ai barele 2.0 și 2.1 Deep Bass, simple și cu bas puternic pentru bani. Urcă spre Bar 300 și 500 pentru Dolby Atmos într-un singur corp, apoi la Bar 800, 1000 și 1300 pentru sisteme mari cu subwoofer și sateliți.',
      },
      {
        h3: 'Sateliții detașabili (Bar 800/1000/1300)',
        body: 'Trăsătura semnătură JBL: sateliții de surround stau atașați de bară și se încarcă acolo, iar când vrei film complet îi detașezi și îi așezi în spate, fără fir. Așa ai o bară compactă în zilele obișnuite și surround real când îți dorești.',
        callout: 'Sateliții detașabili sunt răspunsul JBL la dilema „bară compactă vs. surround real": îi ai pe amândoi în același produs.',
      },
      {
        h3: 'Versiunile MK2 și Dolby Atmos',
        body: 'Modelele MK2 (generația a doua) aduc procesare Atmos și MultiBeam, care simulează un scenariu sonor mai larg. De la Bar 300 în sus găsești Dolby Atmos, iar vârfurile de gamă combină Atmos cu DTS:X și canale de înălțime reale.',
      },
    ],
    comparison: {
      title: 'JBL Bar compact vs. JBL Bar cu sateliți',
      aLabel: 'Bar 2.1 / 300',
      bLabel: 'Bar 800 / 1000',
      rows: [
        { criteriu: 'Surround real', a: 'Nu (sau virtual)', b: 'Da, sateliți detașabili' },
        { criteriu: 'Dolby Atmos', a: 'De la Bar 300', b: 'Da, cu canale de înălțime' },
        { criteriu: 'Montaj', a: 'O singură piesă', b: 'Bară + subwoofer + sateliți' },
        { criteriu: 'Potrivit pentru', a: 'Camere mici-medii', b: 'Sufragerii mari' },
      ],
      verdict:
        'Pentru un upgrade simplu și bas bun, o bară JBL 2.1 sau Bar 300 e alegerea directă. Dacă vrei surround real fără să sacrifici comoditatea, seria Bar 800/1000 cu sateliți detașabili e ce recomandă JBL.',
    },
    faq: [
      { q: 'Care JBL e bun pentru început?', a: 'Barele JBL 2.0 și 2.1 Deep Bass oferă un upgrade clar față de televizor, cu bas generos și montaj simplu. De la Bar 300 în sus adaugi Dolby Atmos într-un singur corp.' },
      { q: 'Ce este MultiBeam?', a: 'E tehnologia JBL care direcționează sunetul pentru un scenariu sonor mai larg dintr-un singur corp, fără sateliți. Ajută la senzația de spațiu la modelele care nu au boxe de surround separate.' },
      { q: 'Cât țin sateliții detașabili pe baterie?', a: 'La modelele Bar 800/1000/1300, sateliții se încarcă atunci când sunt atașați de bară și oferă câteva ore de folosire detașați. Îi pui la loc pe bară între sesiuni ca să rămână încărcați.' },
      { q: 'Merge JBL cu orice televizor?', a: 'Da. Te conectezi prin HDMI (ARC/eARC) sau optic la orice televizor, plus Bluetooth pentru muzică. Nu ai nevoie de un TV JBL sau de un anumit brand.' },
    ],
  },
  'soundbar/lg': {
    intro:
      'Barele LG din seria S acoperă tot spectrul, de la modele 2.1 accesibile la sisteme 5.1.3 cu Dolby Atmos și subwoofer wireless, multe cu acordaj Meridian. Dacă ai și un televizor LG, se sincronizează prin WOW Orchestra pentru un sunet mai amplu. Am filtrat topul la modelele LG și le-am ordonat după sunet, dotări și conectivitate.',
    guide: [
      {
        h3: 'Cum e organizată gama LG S',
        body: 'Numele codifică configurația: un S40T e 2.1, un S65Q e 3.1, iar vârfurile ca S90TY sau S77TY ajung la 5.1.3 și 3.1.3 cu canale de înălțime pentru Atmos. Cu cât urci, cu atât primești mai multe canale și dotări de cinema.',
      },
      {
        h3: 'WOW Orchestra cu televizoarele LG',
        body: 'Dacă ai un televizor LG compatibil, funcția WOW Orchestra pune boxele TV-ului să cânte împreună cu soundbarul, în loc să le oprească. Rezultatul e un scenariu sonor mai înalt și mai plin, un bonus real dacă rămâi în ecosistemul LG.',
        callout: 'WOW Orchestra e un avantaj doar cu un TV LG compatibil; cu alt brand, soundbarul funcționează normal, dar fără această sinergie.',
      },
      {
        h3: 'Meridian și canalele up-firing',
        body: 'Multe bare LG folosesc acordaj audio Meridian pentru un sunet echilibrat. Modelele cu „.2" sau „.3" în nume au difuzoare orientate în sus care reflectă sunetul din tavan pentru Dolby Atmos mai convingător.',
      },
    ],
    comparison: {
      title: 'LG 2.1/3.1 vs. LG 5.1 cu kit surround',
      aLabel: 'LG 2.1 / 3.1',
      bLabel: 'LG 5.1',
      rows: [
        { criteriu: 'Surround din spate', a: 'Nu', b: 'Da, kit wireless inclus la unele' },
        { criteriu: 'Dolby Atmos', a: 'La modelele cu .2/.3', b: 'Da, la gama superioară' },
        { criteriu: 'Montaj', a: 'Simplu', b: 'Necesită loc pentru sateliți' },
        { criteriu: 'Potrivit pentru', a: 'Camere mici-medii', b: 'Sufragerii mari' },
      ],
      verdict:
        'Pentru un upgrade compact cu acordaj bun, o bară LG 2.1 sau 3.1 e alegerea firească. Dacă vrei surround complet, modelele 5.1 cu kit wireless inclus (ca S60TR) îți dau sateliți fără fir lung prin cameră.',
    },
    faq: [
      { q: 'Merge un soundbar LG cu un televizor de alt brand?', a: 'Da, prin HDMI (ARC/eARC), optic sau Bluetooth funcționează cu orice televizor. Pierzi doar funcțiile de sinergie precum WOW Orchestra, care cer un TV LG compatibil.' },
      { q: 'Ce este WOW Orchestra?', a: 'E o funcție LG care face boxele televizorului LG și soundbarul să cânte simultan, pentru un sunet mai amplu și mai înalt. Funcționează doar între un TV LG și un soundbar LG compatibile.' },
      { q: 'Ce înseamnă „.3" din numele LG?', a: 'Al treilea număr arată câte canale de înălțime (difuzoare orientate în sus) are sistemul pentru Dolby Atmos. Un S90TY 5.1.3 are trei astfel de canale, pentru un efect de deasupra mai pronunțat.' },
      { q: 'Kitul de surround e inclus?', a: 'Depinde de model. Unele, ca S60TR, includ deja kitul wireless de surround; la altele îl adaugi separat. Verifică descrierea dacă vrei sateliții din spate din prima.' },
    ],
  },
  'soundbar/samsung': {
    intro:
      'Barele Samsung din seria HW pornesc de la modele B accesibile 2.1 și ajung la sisteme Q de top, cu 5.1.2, 9.1.4 sau chiar 11.1.4 canale și subwoofer wireless. Cu un televizor Samsung, Q-Symphony pune boxele TV-ului să cânte împreună cu bara. Am filtrat topul la modelele Samsung și le-am ordonat după sunet, dotări și conectivitate.',
    guide: [
      {
        h3: 'De la seria B la seria Q',
        body: 'Seria B (ex. HW-B450F, HW-B650D) acoperă nevoile de bază 2.1 și 3.1 la preț bun. Seria Q urcă spre 5.1.2, 9.1.4 și 11.1.4, cu sateliți, mai multe canale de înălțime și Dolby Atmos complet pentru home cinema.',
      },
      {
        h3: 'Q-Symphony și SpaceFit cu TV Samsung',
        body: 'Q-Symphony folosește boxele televizorului Samsung împreună cu soundbarul, în loc să le oprească, pentru un sunet mai învăluitor. SpaceFit calibrează sunetul după acustica încăperii, iar ambele dau ce e mai bun în ecosistemul Samsung.',
        callout: 'Q-Symphony și calibrarea SpaceFit strălucesc cu un televizor Samsung compatibil; cu alt brand, soundbarul rămâne foarte capabil, dar fără aceste funcții.',
      },
      {
        h3: 'Vârful de gamă: Q990 și 11.1.4',
        body: 'Modelele ca HW-Q990F duc lucrurile la extrem, cu configurație 11.1.4, subwoofer și sateliți wireless și Dolby Atmos fără fir. Sunt gândite pentru sufragerii mari care vor experiența completă de cinema, cu efecte din toate direcțiile.',
      },
    ],
    comparison: {
      title: 'Samsung seria B vs. seria Q',
      aLabel: 'Seria B (2.1/3.1)',
      bLabel: 'Seria Q (5.1.2+)',
      rows: [
        { criteriu: 'Canale', a: '2.1 – 3.1', b: '5.1.2 până la 11.1.4' },
        { criteriu: 'Dolby Atmos', a: 'Limitat / virtual', b: 'Complet, cu sateliți' },
        { criteriu: 'Q-Symphony', a: 'La unele modele', b: 'Da' },
        { criteriu: 'Potrivit pentru', a: 'Camere mici-medii', b: 'Sufragerii mari, cinema' },
      ],
      verdict:
        'Pentru un upgrade solid la preț cuminte, seria B acoperă nevoile obișnuite. Dacă vrei home cinema complet cu Atmos și sateliți, seria Q (până la Q990 11.1.4) e vârful pe care îl recomandă Samsung.',
    },
    faq: [
      { q: 'Merge un soundbar Samsung cu un TV de alt brand?', a: 'Da, prin HDMI (ARC/eARC), optic sau Bluetooth. Pierzi doar funcțiile de sinergie precum Q-Symphony, care necesită un televizor Samsung compatibil.' },
      { q: 'Ce este Q-Symphony?', a: 'E funcția Samsung care face boxele televizorului să cânte simultan cu soundbarul, pentru un sunet mai amplu și mai învăluitor. Funcționează între un TV Samsung și un soundbar Samsung compatibile.' },
      { q: 'Merită vârful de gamă HW-Q990?', a: 'Dacă ai o sufragerie mare și vrei experiența de cinema completă, un sistem 11.1.4 cu subwoofer și sateliți wireless oferă efecte din toate direcțiile. Pentru camere mici, e mai mult decât ai nevoie.' },
      { q: 'Subwooferul e wireless?', a: 'La majoritatea modelelor Samsung, da: subwooferul (și, la gama Q, kitul de sateliți) se conectează wireless la bară. Rămâne doar alimentarea la priză.' },
    ],
  },
  'soundbar/sony': {
    intro:
      'Barele Sony din seriile HT și BRAVIA Theatre sunt cunoscute pentru procesarea spațială (360 Spatial Sound Mapping) și, cu un televizor Sony, pentru Acoustic Center Sync, care transformă TV-ul într-un canal central. Găsești de la sisteme 5.1 cu sateliți la bare Atmos compacte. Am filtrat topul la modelele Sony și le-am ordonat după sunet, dotări și conectivitate.',
    guide: [
      {
        h3: 'Seriile HT și BRAVIA Theatre',
        body: 'Sony acoperă tot: sisteme accesibile cu sateliți în cutie (HT-S20R, HT-S40R), bare Atmos compacte (HT-S2000, S2000) și vârfuri BRAVIA Theatre cu procesare avansată. Numele arată configurația, de la 2.1 la 7.1.2.',
      },
      {
        h3: '360 Spatial Sound Mapping',
        body: 'Tehnologia Sony creează câmpuri sonore virtuale în jurul tău prin procesare, pentru senzația că sunetul vine din mai multe direcții, chiar și de la o bară compactă. E marca de fabrică a modelelor superioare Sony.',
      },
      {
        h3: 'Acoustic Center Sync cu TV Sony',
        body: 'Cu un televizor Sony compatibil, Acoustic Center Sync folosește difuzoarele TV-ului drept canal central, așa că vocile par să vină chiar din ecran. E un bonus de coeziune a sunetului rezervat ecosistemului Sony.',
        callout: 'Acoustic Center Sync are efect doar cu un TV Sony compatibil; cu alt brand, soundbarul funcționează normal, dar fără această integrare.',
      },
    ],
    comparison: {
      title: 'Sony bară single vs. sistem cu sateliți',
      aLabel: 'Bară single (HT-S2000)',
      bLabel: 'Sistem cu sateliți (HT-S40R)',
      rows: [
        { criteriu: 'Surround real', a: 'Virtual, prin procesare', b: 'Da, sateliți în spate' },
        { criteriu: 'Montaj', a: 'O singură piesă', b: 'Bară + subwoofer + sateliți' },
        { criteriu: 'Dolby Atmos', a: 'Da, la S2000', b: 'Depinde de model' },
        { criteriu: 'Potrivit pentru', a: 'Camere mici-medii', b: 'Camere unde ai loc de sateliți' },
      ],
      verdict:
        'Dacă vrei simplitate și Atmos dintr-un singur corp, o bară Sony ca HT-S2000 e alegerea curată. Dacă preferi surround real fizic la preț bun, sistemele cu sateliți incluși (HT-S20R/S40R) îți dau boxe pentru spate din prima.',
    },
    faq: [
      { q: 'Merge un soundbar Sony cu un TV de alt brand?', a: 'Da, prin HDMI (ARC/eARC), optic sau Bluetooth funcționează cu orice televizor. Pierzi doar funcțiile de sinergie precum Acoustic Center Sync, care cer un TV Sony compatibil.' },
      { q: 'Ce este 360 Spatial Sound Mapping?', a: 'E procesarea Sony care creează câmpuri sonore virtuale în jurul ascultătorului, pentru o senzație de sunet învăluitor chiar și de la o bară compactă, fără multe difuzoare fizice.' },
      { q: 'Ce fac modelele cu sateliți în cutie?', a: 'Sisteme ca HT-S20R și HT-S40R includ deja sateliții de surround pentru spate, oferind 5.1 real la preț accesibil. Verifică modul de conectare al sateliților pentru a-i plasa comod în cameră.' },
      { q: 'Ce e Voice Zoom?', a: 'E o funcție Sony care evidențiază vocile față de restul sunetului, pentru dialog mai clar la filme. Versiunile recente (AI Voice Zoom) reglează inteligent, în funcție de conținut.' },
    ],
  },
  'soundbar/philips': {
    intro:
      'Barele Philips din seria TAB oferă un raport preț-dotări foarte bun: multe modele includ Dolby Atmos și subwoofer wireless chiar și la configurația 2.1. E o linie potrivită pentru un upgrade clar fără să treci într-o gamă de preț mare. Am filtrat topul la modelele Philips și le-am ordonat după sunet, dotări și conectivitate.',
    guide: [
      {
        h3: 'Cum e organizată gama Philips TAB',
        body: 'Numărul din nume (TAB5309, TAB6309, TAB8905) urcă odată cu dotările și puterea: de la 2.1 accesibile la 3.1.2 cu canale de înălțime. Multe includ subwoofer wireless și Dolby Atmos, chiar la modelele de mijloc de gamă.',
      },
      {
        h3: 'Atmos și subwoofer chiar la 2.1',
        body: 'Punctul forte Philips e că nu trebuie să urci mult ca să primești Dolby Atmos (adesea virtual) și subwoofer wireless. Așa iei bas real și un plus de spațialitate la un preț la care alte branduri oferă doar bara simplă.',
        callout: 'La Philips, dotări ca Atmos și subwoofer wireless apar des chiar și pe modelele 2.1 accesibile, de unde raportul bun preț-dotări.',
      },
      {
        h3: 'Conectare și compatibilitate',
        body: 'Modelele TAB se leagă prin HDMI (ARC/eARC), optic și Bluetooth, deci merg cu orice televizor. Cele cu AirPlay adaugă redare simplă de pe dispozitive Apple, util dacă asculți și multă muzică.',
      },
    ],
    comparison: {
      title: 'Philips 2.1 vs. 3.1.2 cu înălțime',
      aLabel: 'Philips 2.1',
      bLabel: 'Philips 3.1.2',
      rows: [
        { criteriu: 'Canal central', a: 'Nu', b: 'Da, dialog mai clar' },
        { criteriu: 'Canale de înălțime', a: 'Nu (Atmos virtual la unele)', b: 'Da, up-firing pentru Atmos' },
        { criteriu: 'Bas', a: 'Subwoofer wireless', b: 'Subwoofer wireless' },
        { criteriu: 'Potrivit pentru', a: 'Camere mici-medii', b: 'Cine vrea Atmos real, buget cuminte' },
      ],
      verdict:
        'O bară Philips 2.1 cu subwoofer wireless e cel mai bun raport preț-rezultat pentru majoritatea camerelor. Dacă vrei dialog mai clar și Atmos cu canale de înălțime reale, un model 3.1.2 ca TAB8905 e pasul următor logic.',
    },
    faq: [
      { q: 'Sunt barele Philips o alegere bună la buget?', a: 'Da, punctul lor forte e raportul preț-dotări: primești des Dolby Atmos și subwoofer wireless la un preț la care alte branduri oferă doar bara simplă. Sunt un upgrade clar față de sunetul televizorului.' },
      { q: 'Ce fel de Atmos au modelele Philips?', a: 'Depinde de model: cele 2.1 oferă de obicei Atmos virtual (prin procesare), iar cele cu „.2" în nume (ex. 3.1.2) au difuzoare orientate în sus pentru un efect de înălțime real.' },
      { q: 'Merge un soundbar Philips cu orice televizor?', a: 'Da. Conectarea prin HDMI (ARC/eARC), optic sau Bluetooth funcționează cu orice televizor, indiferent de brand. Nu ai nevoie de un TV Philips.' },
      { q: 'Au modelele Philips sateliți de surround?', a: 'Majoritatea barelor TAB sunt sisteme frontale (2.1, 3.1.2), fără sateliți în spate. Dacă vrei surround real din spate, caută un sistem 5.1 dedicat; Philips oferă și modele mai ample precum B95/10 5.1.2.' },
    ],
  },
};

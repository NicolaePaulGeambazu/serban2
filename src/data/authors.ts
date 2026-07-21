export interface Author { id: string; name: string; role: string; bio: string; photo: string; expertise: string[]; }
export const authors: Record<string, Author> = {
  'mihai-radu': { id: 'mihai-radu', name: 'Mihai Radu', role: 'Redactor-șef, electrocasnice & climatizare',
    bio: 'Scrie despre electrocasnice și climatizare de peste 8 ani. Compară specificațiile oficiale și recenziile cumpărătorilor pentru zeci de mașini de spălat, aparate de aer condiționat și cuptoare, ca să dea recomandări clare.',
    photo: '/img/authors/mihai-radu.svg', expertise: ['electrocasnice', 'climatizare', 'bucătărie'] },
  'ana-popescu': { id: 'ana-popescu', name: 'Ana Popescu', role: 'Redactor tech & lifestyle',
    bio: 'Scrie despre laptopuri, monitoare și gadgeturi de fitness. Îi place să compare pe date reale, nu pe fișa tehnică a producătorului.',
    photo: '/img/authors/ana-popescu.svg', expertise: ['laptopuri', 'monitoare', 'sport', 'plăci video'] },
};
export function getAuthor(id: string): Author { return authors[id] ?? authors['mihai-radu']; }

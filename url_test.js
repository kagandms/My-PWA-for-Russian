const location = { origin: 'https://kagandms.github.io' };
// Wait, in a browser, location.origin is the origin.
// In sw.js, self.location is the location of the SW.
const swLocation = new URL('https://kagandms.github.io/ru-tr_kagan/sw.js');
console.log(swLocation.origin); // https://kagandms.github.io
console.log(new URL('./js/app.js', swLocation.origin).href); 
// -> https://kagandms.github.io/js/app.js
console.log(new URL('./js/app.js', swLocation.href).href);
// -> https://kagandms.github.io/ru-tr_kagan/js/app.js

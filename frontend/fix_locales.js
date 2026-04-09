const fs = require('fs');

function fixJSON(lang) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  
  if (lang === 'en') {
    data.animation.title = "Storytelling sequence";
  } else if (lang === 'ru') {
    data.animation.title = "Сюжетная анимация";
  } else if (lang === 'kk') {
    data.animation.title = "Сюжеттік анимация";
  }
  
  if (lang === 'kk') {
    function replaceAI(obj) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/АИ/g, 'ЖИ').replace(/AI/g, 'ЖИ');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          replaceAI(obj[key]);
        }
      }
    }
    replaceAI(data);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

['en', 'ru', 'kk'].forEach(fixJSON);

console.log("Locales fixed!");

const fs = require('fs');

const anEn = {
  title: 'Storytelling sequence (plays once)',
  desc: 'A simple 3D cinematic: debris intersects a satellite and the satellite becomes non-operational. Use OrbitControls to inspect, and press restart if you want to rewatch.',
  restartBtn: 'Restart animation',
  aiBtn: 'Go to AI Engine →',
  tip: 'Tip: drag to rotate • scroll to zoom • right-click to pan'
};

const anRu = {
  title: 'Сюжетная анимация (воспроизводится 1 раз)',
  desc: 'Простая 3D-кинематика: обломок сталкивается со спутником, и спутник выходит из строя. Управляйте камерой для осмотра. Нажмите "Перезапуск", чтобы посмотреть снова.',
  restartBtn: 'Перезапуск анимации',
  aiBtn: 'Перейти к ИИ →',
  tip: 'Подсказка: зажмите ЛКМ для вращения • колесико для зума • ПКМ для панорамирования'
};

const anKk = {
  title: 'Сюжеттік анимация (бір рет ойнатылады)',
  desc: 'Қарапайым 3D-кинематика: қоқыс спутникпен соқтығысып, спутник істен шығады. Қарау үшін камераны басқарыңыз, қайта көру үшін қайта іске қосуды басыңыз.',
  restartBtn: 'Анимацияны қайта қосу',
  aiBtn: 'АИ қозғалтқышына өту →',
  tip: 'Кеңес: бұру үшін тартыңыз • үлкейту үшін айналдырыңыз • жылжыту үшін оң жақпен басыңыз'
};

function updateFile(lang, newObj) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  data.animation = newObj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateFile('en', anEn);
updateFile('ru', anRu);
updateFile('kk', anKk);

console.log("Locales updated!");

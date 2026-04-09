const fs = require('fs');

const oEn = {
  title: 'Live orbit + collision telemetry',
  desc: 'Technical view. Streams multi-object state to the backend and renders velocity vectors, orbit paths, and closest-approach highlighting. Camera is fully movable.',
  assessment: 'Current Assessment',
  waiting: 'Waiting for telemetry…',
  finalRisk: 'Final Risk',
  mlModel: 'ML Model',
  ruleEngine: 'Rule Engine',
  confidence: 'Confidence',
  minDist: 'Min Distance',
  tca: 'TCA',
  layers: 'Layers & Tools',
  showDebris: 'Show debris',
  showPaths: 'Show orbit paths',
  whatYouSee: 'What you\'re seeing',
  see1: 'Orbit paths (circular LEO approximation)',
  see2: 'Velocity vectors (THREE.ArrowHelper)',
  see3: 'Closest-approach marker (midpoint highlight)',
  see4: 'Telemetry streamed to backend (multi-object)',
  scenarioBtn: 'Open Scenario Controls →',
  aiBtn: 'Open AI Explainability →'
};

const oRu = {
  title: 'Живая физика + телеметрия',
  desc: 'Технический вид. Передает состояние объектов на сервер и рисует векторы скорости, орбиты и точку сближения. Камерой можно свободно управлять.',
  assessment: 'Текущая оценка',
  waiting: 'Ожидание телеметрии…',
  finalRisk: 'Итоговый риск',
  mlModel: 'ИИ-модель',
  ruleEngine: 'Правила',
  confidence: 'Уверенность',
  minDist: 'Мин. расст.',
  tca: 'Время',
  layers: 'Слои и инструменты',
  showDebris: 'Показать мусор',
  showPaths: 'Показать орбиты',
  whatYouSee: 'Что вы видите',
  see1: 'Орбиты (круговое приближение LEO)',
  see2: 'Векторы скорости (THREE.ArrowHelper)',
  see3: 'Маркер сближения (подсветка)',
  see4: 'Телеметрия передается на сервер (реалтайм)',
  scenarioBtn: 'Открыть сценарии →',
  aiBtn: 'Показать работу ИИ →'
};

const oKk = {
  title: 'Нақты уақыт физикасы + телеметрия',
  desc: 'Техникалық көрініс. Нысандардың күйін серверге жіберіп, жылдамдық векторларын, орбиталарды және ең жақын нүктені көрсетеді. Камера толық басқарылады.',
  assessment: 'Ағымдағы бағалау',
  waiting: 'Телеметрия күтілуде…',
  finalRisk: 'Соңғы қауіп',
  mlModel: 'АИ моделі',
  ruleEngine: 'Ережелер',
  confidence: 'Сенімділік',
  minDist: 'Мин. қаш.',
  tca: 'Уақыт',
  layers: 'Қабаттар және құралдар',
  showDebris: 'Қоқысты көрсету',
  showPaths: 'Орбиталарды көрсету',
  whatYouSee: 'Не көріп тұрсыз',
  see1: 'Орбиталар (Жерге жақын шеңберлі)',
  see2: 'Жылдамдық векторлары (THREE.ArrowHelper)',
  see3: 'Жақындау маркері (ерекшелеу)',
  see4: 'Телеметрия серверге жіберіледі (нақты уақыт)',
  scenarioBtn: 'Сценарийлерді ашу →',
  aiBtn: 'АИ жұмысын көрсету →'
};

function updateFile(lang, newObj) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  data.orbit = newObj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateFile('en', oEn);
updateFile('ru', oRu);
updateFile('kk', oKk);

console.log("Locales updated!");

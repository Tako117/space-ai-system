const fs = require('fs');

const aEn = {
  title: 'Explainable collision risk — computed automatically',
  desc: 'This page is a readable AI dashboard (not a JSON playground). It shows the selected satellite/debris pair, live computed values, dominant factors, and confidence rationale — updated continuously from WebSocket telemetry.',
  selection: 'Selection',
  satellite: 'Satellite',
  debris: 'Debris',
  waiting: 'Waiting for telemetry…',
  streamingState: 'Streaming state…',
  liveReportUpdated: 'Live report updated',
  streamingModeDesc: 'Streaming mode: orbit/scenario pages can publish synthetic states, but your backend also broadcasts real TLE propagation every ~2s.',
  orbitTelemetryBtn: 'Open Orbit Telemetry →',
  currentAssessment: 'Current Assessment',
  activePair: 'Active Pair',
  satLabel: 'Sat:',
  debLabel: 'Deb:',
  finalRisk: 'Final Risk',
  ruleBased: '↳ Rule-based',
  mlPrediction: '↳ ML Prediction',
  minDist: 'Min distance',
  tca: 'Time to closest',
  speed: 'Relative speed',
  confidence: 'Confidence',
  riskDrivers: 'Risk Drivers',
  riskDesc: 'Risk is dominated by three measurable factors:',
  rd1: 'distance vs threshold',
  rd2: 'relative speed at approach',
  rd3: 'how soon the approach happens',
  distLabel: 'Distance',
  speedLabel: 'Speed',
  timingLabel: 'Timing',
  recommendedResponse: 'Recommended Response',
  waitingWs: 'Waiting for WebSocket telemetry…'
};

const aRu = {
  title: 'Объяснимый риск столкновения — вычисляется автоматически',
  desc: 'Эта страница — понятный ИИ-дашборд. Она показывает выбранную пару спутник/мусор, живые расчетные значения, доминирующие факторы и логику уверенности — обновляясь непрерывно по вебсокету.',
  selection: 'Выбор объектов',
  satellite: 'Спутник',
  debris: 'Обломок',
  waiting: 'Ожидание телеметрии…',
  streamingState: 'Получение состояния…',
  liveReportUpdated: 'Живой отчет обновлен',
  streamingModeDesc: 'Режим стриминга: другие страницы могут отправлять тестовые данные, но сервер также регулярно (~2с) рассылает расчет орбиты по TLE.',
  orbitTelemetryBtn: 'Открыть телеметрию орбиты →',
  currentAssessment: 'Текущая оценка',
  activePair: 'Активная пара',
  satLabel: 'Спутник:',
  debLabel: 'Обломок:',
  finalRisk: 'Итоговый риск',
  ruleBased: '↳ Правила',
  mlPrediction: '↳ ИИ-Прогноз',
  minDist: 'Мин. расстояние',
  tca: 'Время до сближения',
  speed: 'Относит. скорость',
  confidence: 'Уверенность',
  riskDrivers: 'Драйверы риска',
  riskDesc: 'Риск определяется тремя измеримыми факторами:',
  rd1: 'расстояние от порога',
  rd2: 'скорость сближения',
  rd3: 'насколько скоро сближение',
  distLabel: 'Дистанция',
  speedLabel: 'Скорость',
  timingLabel: 'Время',
  recommendedResponse: 'Рекомендуемое действие',
  waitingWs: 'Ожидание данных вебсокета…'
};

const aKk = {
  title: 'Түсінікті қақтығыс қаупі — автоматты түрде есептеледі',
  desc: 'Бұл бет — AI бақылау тақтасы. Мұнда таңдалған спутник/қоқыс жұбы, нақты уақыттағы есептеулер, негізгі факторлар және сенімділік логикасы көрсетіледі.',
  selection: 'Нысандарды таңдау',
  satellite: 'Спутник',
  debris: 'Қоқыс',
  waiting: 'Телеметрия күтілуде…',
  streamingState: 'Күйді алу…',
  liveReportUpdated: 'Нақты уақыт есебі жаңартылды',
  streamingModeDesc: 'Стриминг режимі: басқа беттер синтетикалық мәліметтер жібере алады, бірақ сервер де әр ~2с сайын TLE таратады.',
  orbitTelemetryBtn: 'Орбита телеметриясын ашу →',
  currentAssessment: 'Ағымдағы бағалау',
  activePair: 'Белсенді жұп',
  satLabel: 'Спутник:',
  debLabel: 'Қоқыс:',
  finalRisk: 'Соңғы қауіп',
  ruleBased: '↳ Ереже бойынша',
  mlPrediction: '↳ АИ Болжамы',
  minDist: 'Мин. қашықтық',
  tca: 'Жақындау уақыты',
  speed: 'Салыстырмалы жылдамдық',
  confidence: 'Сенімділік',
  riskDrivers: 'Қауіп факторлары',
  riskDesc: 'Қауіп негізгі үш фактормен анықталады:',
  rd1: 'шектен қашықтығы',
  rd2: 'жақындау жылдамдығы',
  rd3: 'жақындасудың қаншалықты тез болатыны',
  distLabel: 'Қашықтық',
  speedLabel: 'Жылдамдық',
  timingLabel: 'Уақыт',
  recommendedResponse: 'Ұсынылатын әрекет',
  waitingWs: 'WebSocket деректері күтілуде…'
};

function updateFile(lang, newObj) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  data.ai = newObj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateFile('en', aEn);
updateFile('ru', aRu);
updateFile('kk', aKk);

console.log("Locales updated!");

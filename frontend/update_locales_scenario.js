const fs = require('fs');

const sEn = {
  waiting: 'Move sliders to calculate risk…',
  calculating: 'Calculating…',
  updated: 'Updated',
  title: 'Mission Decision-Support',
  desc: 'Hypothetical scenario modeling with instantaneous risk assessment, collision previews, and maneuver generation.',
  controlsTitle: 'Scenario Controls',
  closestApp: 'Closest approach (km)',
  relVel: 'Relative velocity (km/s)',
  tca: 'Time to closest (min)',
  altDiff: 'Altitude difference (km)',
  assessment: 'Current Assessment',
  ruleBased: '↳ Rule-based Risk',
  mlPrediction: '↳ ML Prediction',
  unavailable: 'Unavailable',
  recommendedResponse: 'Recommended Response',
  minDist: 'Min Distance',
  tcaMetric: 'Time To Closest',
  confidence: 'Confidence',
  riskDrivers: 'Risk Drivers',
  distFactor: 'Distance factor',
  speedFactor: 'Speed factor',
  timingFactor: 'Timing factor',
  collisionPreview: 'Collision Preview',
  waitingData: 'Waiting for scenario data...',
  avoidanceManeuver: 'Avoidance Maneuver Preview',
  recommendedAction: 'Recommended Action',
  deltaV: 'Estimated Delta-v',
  execWindow: 'Execution Window',
  inPre: 'In ',
  inPost: ' s',
  safeSep: 'Predicted Safe Separation',
  residualRisk: 'Predicted Residual Risk'
};

const sRu = {
  waiting: 'Двигайте ползунки для расчета…',
  calculating: 'Вычисление…',
  updated: 'Обновлено',
  title: 'Поддержка принятия решений',
  desc: 'Гипотетическое моделирование с мгновенной оценкой риска, просмотром столкновений и генерацией маневров уклонения.',
  controlsTitle: 'Управление сценарием',
  closestApp: 'Мин. расстояние (км)',
  relVel: 'Относит. скорость (км/с)',
  tca: 'Время до сближения (мин)',
  altDiff: 'Разница высот (км)',
  assessment: 'Текущая оценка',
  ruleBased: '↳ Риск по правилам',
  mlPrediction: '↳ ИИ-Прогноз',
  unavailable: 'Недоступно',
  recommendedResponse: 'Рекомендуемый ответ',
  minDist: 'Мин. расстояние',
  tcaMetric: 'Время до сближения',
  confidence: 'Уверенность',
  riskDrivers: 'Драйверы риска',
  distFactor: 'Фактор расстояния',
  speedFactor: 'Фактор скорости',
  timingFactor: 'Фактор времени',
  collisionPreview: 'Просмотр столкновения',
  waitingData: 'Ожидание данных сценария...',
  avoidanceManeuver: 'Просмотр маневра уклонения',
  recommendedAction: 'Действие',
  deltaV: 'Расчетная Delta-v',
  execWindow: 'Окно выполнения',
  inPre: 'Через ',
  inPost: ' с',
  safeSep: 'Расчетная безопасная дистанция',
  residualRisk: 'Остаточный риск'
};

const sKk = {
  waiting: 'Сырғытпаларды жылжытыңыз…',
  calculating: 'Есептелуде…',
  updated: 'Жаңартылды',
  title: 'Шешім қабылдауды қолдау',
  desc: 'Қақтығыс қаупін, маневрлерді жасауды және алдын ала қарауды жылдам бағалайтын модельдеу сценарийі.',
  controlsTitle: 'Сценарийді басқару',
  closestApp: 'Мин. қашықтық (км)',
  relVel: 'Салыстырмалы жылдамдық (км/с)',
  tca: 'Жақындау уақыты (мин)',
  altDiff: 'Биіктік айырмашылығы (км)',
  assessment: 'Ағымдағы бағалау',
  ruleBased: '↳ Ережелік қауіп',
  mlPrediction: '↳ АИ Болжамы',
  unavailable: 'Қол жетімсіз',
  recommendedResponse: 'Ұсынылған жауап',
  minDist: 'Мин қашықтық',
  tcaMetric: 'Жақындау уақыты',
  confidence: 'Сенімділік',
  riskDrivers: 'Қауіп факторлары',
  distFactor: 'Қашықтық факторы',
  speedFactor: 'Жылдамдық факторы',
  timingFactor: 'Уақыт факторы',
  collisionPreview: 'Қақтығысты алдын ала көру',
  waitingData: 'Сценарий деректері күтілуде...',
  avoidanceManeuver: 'Жалтару маневрін көру',
  recommendedAction: 'Әрекет',
  deltaV: 'Есептелген Delta-v',
  execWindow: 'Орындау терезесі',
  inPre: '',
  inPost: ' сек ішінде',
  safeSep: 'Қауіпсіз қашықтық болжамы',
  residualRisk: 'Қалдық қауіп'
};

function updateFile(lang, newObj) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  data.scenario = newObj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateFile('en', sEn);
updateFile('ru', sRu);
updateFile('kk', sKk);

console.log("Locales updated!");

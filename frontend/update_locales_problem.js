const fs = require('fs');

const problemStr = {
  title: 'The debris problem is accelerating.',
  p1: 'Every launch, fragmentation event, and collision multiplies the number of tracked objects. In low Earth orbit, relative velocities are so extreme that even small fragments can disable satellites instantly — risking chain reactions known as the Kessler Syndrome.',
  watchBtn: 'Watch cinematic incident →',
  telemetryBtn: 'Open live telemetry',
  v1Title: 'Exponential growth',
  v1Body: 'More satellites, more launches, more fragmentation. The risk surface expands faster than manual monitoring can keep up.',
  v2Title: 'Kessler Syndrome',
  v2Body: 'Collisions generate debris that causes more collisions — a cascade that can make key orbits unusable for decades.',
  v3Title: 'High-energy impacts',
  v3Body: 'Orbital objects can close at ~7–14 km/s. A small bolt carries the destructive energy of a high-speed projectile.',
  riskVector: 'Risk Vector',
  aiTitle: 'AI is the scaling solution.',
  aiBody: 'We compute collision probability in real time and push warnings directly into the orbital visualization.',
  goAiBtn: 'Go to AI Engine →'
};

const problemStrRu = {
  title: 'Проблема космического мусора нарастает.',
  p1: 'Каждый запуск, фрагментация и столкновение увеличивают количество объектов. На низкой околоземной орбите относительные скорости настолько велики, что даже крошечные обломки могут мгновенно уничтожить спутник — вызывая цепную реакцию, известную как синдром Кесслера.',
  watchBtn: 'Смотреть инцидент →',
  telemetryBtn: 'Открыть телеметрию',
  v1Title: 'Экспоненциальный рост',
  v1Body: 'Больше спутников, больше запусков, больше фрагментации. Зона риска растет быстрее, чем возможности ручного мониторинга.',
  v2Title: 'Синдром Кесслера',
  v2Body: 'Столкновения порождают мусор, вызывающий новые столкновения — каскад, который может сделать ключевые орбиты непригодными на десятилетия.',
  v3Title: 'Удары высокой энергии',
  v3Body: 'Орбитальные объекты сближаются на скорости ~7–14 км/с. Маленький болт обладает разрушительной силой высокоскоростного снаряда.',
  riskVector: 'Вектор риска',
  aiTitle: 'ИИ — масштабируемое решение.',
  aiBody: 'Мы вычисляем вероятность столкновения в реальном времени и выводим предупреждения прямо на орбитальную визуализацию.',
  goAiBtn: 'Перейти к ИИ →'
};

const problemStrKk = {
  title: 'Ғарыш қоқысы мәселесі ушығып келеді.',
  p1: 'Әрбір ұшырылым, сынық немесе қақтығыс бақыланатын нысандар санын көбейтеді. Төменгі Жер орбитасында салыстырмалы жылдамдық өте жоғары, кішкене бөлшектер спутниктерді бірден істен шығаруы мүмкін — бұл Кесслер синдромы деген тізбекті реакцияны тудырады.',
  watchBtn: 'Оқиғаны көру →',
  telemetryBtn: 'Телеметрияны ашу',
  v1Title: 'Экспоненциалды өсу',
  v1Body: 'Көп спутник, көп ұшыру, көп сынық. Қауіпті аймақ қолмен бақылау мүмкіндігінен әлдеқайда жылдам өсуде.',
  v2Title: 'Кесслер синдромы',
  v2Body: 'Қақтығыстар жаңа қақтығыстар тудыратын қоқыстарды туғызады — бұл негізгі орбиталарды ондаған жылдар бойы жарамсыз етуі мүмкін.',
  v3Title: 'Жоғары энергиялы соққылар',
  v3Body: 'Орбиталық нысандар ~7–14 км/с жылдамдықпен жақындасады. Кішкентай болттың өзі жоғары жылдамдықты снарядтай жойғыш күшке ие.',
  riskVector: 'Қауіп векторы',
  aiTitle: 'АИ — масштабталатын шешім.',
  aiBody: 'Біз қақтығыс ықтималдығын нақты уақыт режимінде есептеп, ескертулерді орбиталық визуализацияға тікелей жібереміз.',
  goAiBtn: 'АИ қозғалтқышына өту →'
};

function updateFile(lang, newObj) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  data.problem = newObj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateFile('en', problemStr);
updateFile('ru', problemStrRu);
updateFile('kk', problemStrKk);

console.log("Locales updated!");

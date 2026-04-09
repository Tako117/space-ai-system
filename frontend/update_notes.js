const fs = require('fs');

function addNotes(lang, notes) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  if (!data.dynamic) data.dynamic = {};
  data.dynamic.notes = notes;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

addNotes('en', {
  NOTE_CLOSEST_OUTSIDE: "Closest approach is outside the scenario threshold; risk decays quickly.",
  NOTE_ALT_DIFF: "Large altitude difference makes an encounter less plausible (risk reduced).",
  NOTE_FAR_TIME: "Approach is far in time; uncertainty dominates the scenario."
});

addNotes('ru', {
  NOTE_CLOSEST_OUTSIDE: "Мин. дистанция вне пороговой зоны сценария; риск быстро снижается.",
  NOTE_ALT_DIFF: "Большая разница высот делает столкновение маловероятным (риск снижен).",
  NOTE_FAR_TIME: "Сближение далеко во времени; доминирует неопределенность."
});

addNotes('kk', {
  NOTE_CLOSEST_OUTSIDE: "Ең жақын қашықтық сценарий шегінен тыс; қауіп тез төмендейді.",
  NOTE_ALT_DIFF: "Биіктіктің үлкен айырмашылығы қақтығысуды екіталай етеді (қауіп азайтылды).",
  NOTE_FAR_TIME: "Жақындау уақыты әлі алыс; сценарийде белгісіздік басым."
});

console.log("Notes translated!");

const fs = require('fs');

const dEn = {
  severities: {
    LOW: "Low",
    MEDIUM: "Medium", 
    HIGH: "High",
    CRITICAL: "Critical"
  },
  actions: {
    NO_ACTION: "No Action",
    MONITOR: "Monitor",
    AVOIDANCE_MANEUVER: "Avoidance Maneuver"
  }
};

const dRu = {
  severities: {
    LOW: "Низкий",
    MEDIUM: "Средний", 
    HIGH: "Высокий",
    CRITICAL: "Критический"
  },
  actions: {
    NO_ACTION: "Нет действий",
    MONITOR: "Мониторинг",
    AVOIDANCE_MANEUVER: "Маневр уклонения"
  }
};

const dKk = {
  severities: {
    LOW: "Төмен",
    MEDIUM: "Орташа", 
    HIGH: "Жоғары",
    CRITICAL: "Критикалық"
  },
  actions: {
    NO_ACTION: "Әрекетсіз",
    MONITOR: "Мониторинг",
    AVOIDANCE_MANEUVER: "Жалтару маневрі"
  }
};

function updateFile(lang, newObj) {
  const filePath = `locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(filePath));
  data.dynamic = newObj;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

updateFile('en', dEn);
updateFile('ru', dRu);
updateFile('kk', dKk);

console.log("Locales dynamic updated!");

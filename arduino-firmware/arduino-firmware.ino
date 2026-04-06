#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// I2C address 0x27, 16x2 chars
LiquidCrystal_I2C lcd(0x27, 16, 2);

const int BUZZER_PIN = 8;

// Display layers
String displayedRisk = "";
String displayedSeverity = "";
unsigned long displayedSince = 0;
const unsigned long HOLD_TIME_MS = 5000;

// Pending layer
String pendingRisk = "";
String pendingSeverity = "";
bool hasPending = false;

// Buzzer state
unsigned long previousMillisBuzzer = 0;
bool buzzerState = false;
int buzzerInterval = 0;

void setup() {
  Serial.begin(9600);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Space AI System");
  lcd.setCursor(0, 1);
  lcd.print("Ready.");
  
  delay(1000);
  lcd.clear();
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Process incoming Serial data
  if (Serial.available() > 0) {
    String payload = Serial.readStringUntil('\n');
    payload.trim();
    
    if (payload.length() > 0 && payload.indexOf(',') > 0) {
      int commaIndex = payload.indexOf(',');
      String newRisk = payload.substring(0, commaIndex);
      String newSeverity = payload.substring(commaIndex + 1);
      
      // Basic input validation
      if (newRisk.length() > 0 && newSeverity.length() > 0) {
        
        // Display Logic
        // If display is currently empty, or we have an urgent escalation
        bool isUrgent = (newSeverity == "HIGH" || newSeverity == "CRITICAL");
        bool urgentEscalation = isUrgent && (displayedSeverity != "HIGH" && displayedSeverity != "CRITICAL");
        bool displayEmpty = (displayedRisk == "");

        if (displayEmpty || urgentEscalation) {
          // Bypass hold and update immediately
          displayedRisk = newRisk;
          displayedSeverity = newSeverity;
          displayedSince = currentMillis;
          hasPending = false;
          updateDisplay();
        } else {
          // Store as pending to be shown when hold expires
          pendingRisk = newRisk;
          pendingSeverity = newSeverity;
          hasPending = true;
        }
      }
    }
  }

  // 2. Process Pending Display Updates
  // If we have a pending value and the hold time has expired
  if (hasPending && displayedRisk != "") {
    if (currentMillis - displayedSince >= HOLD_TIME_MS) {
      displayedRisk = pendingRisk;
      displayedSeverity = pendingSeverity;
      displayedSince = currentMillis;
      hasPending = false;
      updateDisplay();
    }
  }

  // 3. Update Buzzer state continuously based ONLY on displayed severity
  if (displayedSeverity == "CRITICAL") {
    buzzerInterval = 150;
  } else if (displayedSeverity == "HIGH") {
    buzzerInterval = 500;
  } else {
    buzzerInterval = 0;
    digitalWrite(BUZZER_PIN, LOW);
  }

  // 4. Process Buzzer non-blocking toggles
  if (buzzerInterval > 0) {
    if (currentMillis - previousMillisBuzzer >= buzzerInterval) {
      previousMillisBuzzer = currentMillis;
      buzzerState = !buzzerState;
      if (buzzerState) {
        tone(BUZZER_PIN, buzzerInterval == 150 ? 2000 : 1000);
      } else {
        noTone(BUZZER_PIN);
      }
    }
  } else {
    noTone(BUZZER_PIN);
  }
}

void updateDisplay() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("RISK: ");
  lcd.print(displayedRisk);
  lcd.print("%");
  
  lcd.setCursor(0, 1);
  lcd.print("LEVEL: ");
  lcd.print(displayedSeverity);
}

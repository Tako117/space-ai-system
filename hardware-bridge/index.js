const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Try to auto-detect Arduino or use a specific port if known
// For Windows, it's typically COM3, COM4, etc.
const SERIAL_PORT_PATH = process.env.COM_PORT || ''; 
const BAUD_RATE = 9600;

let port = null;

async function connectToSerial() {
  if (SERIAL_PORT_PATH) {
    initPort(SERIAL_PORT_PATH);
    return;
  }

  try {
    const ports = await SerialPort.list();
    console.log('Available ports:', ports.map(p => p.path));
    
    // Simple heuristic: pick the first one that has "usb" or "arduino" in manufacturer or pnpId, or just the last available port
    const arduinoPort = ports.find(p => 
      (p.manufacturer && p.manufacturer.toLowerCase().includes('arduino')) || 
      (p.pnpId && p.pnpId.toLowerCase().includes('arduino')) ||
      (p.path.startsWith('COM'))
    );

    if (arduinoPort) {
      console.log(`Auto-detected likely Arduino port: ${arduinoPort.path}`);
      initPort(arduinoPort.path);
    } else {
      console.log('No serial ports found. Running in mock mode (no hardware connected).');
    }
  } catch (err) {
    console.error('Error listing serial ports:', err);
  }
}

function initPort(path) {
  port = new SerialPort({ path, baudRate: BAUD_RATE }, (err) => {
    if (err) {
      console.error('Error opening port: ', err.message);
      port = null;
    } else {
      console.log(`Serial port opened on ${path} at ${BAUD_RATE} baud`);
    }
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', console.log);
}

connectToSerial();

app.post('/hardware/sync', (req, res) => {
  const { final_risk, severity, recommended_action } = req.body;
  
  // Format risk as an integer percentage string for better hardware display readability (e.g., "12" instead of "11.8")
  const riskPct = Math.round(Math.max(0, Math.min(1, final_risk)) * 100).toString();
  
  console.log(`Received Scenario State -> Risk: ${riskPct}%, Sev: ${severity}, Action: ${recommended_action}`);
  
  if (port && port.isOpen) {
    // Send comma-separated data to Arduino: <risk_pct>,<severity>\n
    const payload = `${riskPct},${severity}\n`;
    port.write(payload, (err) => {
      if (err) {
        console.error('Error writing to serial', err);
      }
    });
  }

  res.json({ success: true, hardwareConnected: !!port });
});

app.listen(PORT, () => {
  console.log(`Hardware bridge listening on http://localhost:${PORT}`);
});

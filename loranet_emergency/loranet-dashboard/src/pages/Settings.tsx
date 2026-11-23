import { useState } from 'react';
import {
  Settings as SettingsIcon, Radio, Shield, Bell,
  Save, RotateCcw, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { addToast } = useApp();

  // Network RF Settings
  const [frequency, setFrequency] = useState('868.100');
  const [spreadingFactor, setSpreadingFactor] = useState('SF9');
  const [bandwidth, setBandwidth] = useState('125');
  const [codingRate, setCodingRate] = useState('4/5');
  const [txPower, setTxPower] = useState('22');

  // Gateway Bridge Settings
  const [interfaceType, setInterfaceType] = useState('serial');
  const [serialPort, setSerialPort] = useState('COM4');
  const [baudRate, setBaudRate] = useState('115200');
  const [wsEndpoint, setWsEndpoint] = useState('ws://127.0.0.1:8080/lora');

  // Alert & System Settings
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [batteryThreshold, setBatteryThreshold] = useState('20');
  const [snrThreshold, setSnrThreshold] = useState('3.0');
  const [pollInterval, setPollInterval] = useState('30');
  const [autoAcknowledge, setAutoAcknowledge] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Network and hardware configuration saved successfully', 'success');
  };

  const handleResetDefaults = () => {
    setFrequency('868.100');
    setSpreadingFactor('SF9');
    setBandwidth('125');
    setCodingRate('4/5');
    setTxPower('22');
    setInterfaceType('serial');
    setSerialPort('COM4');
    setBaudRate('115200');
    setSoundAlerts(true);
    setBatteryThreshold('20');
    setSnrThreshold('3.0');
    setPollInterval('30');
    setAutoAcknowledge(false);
    addToast('Reset to default emergency disaster configurations', 'info');
  };

  return (
    <div className="px-4 md:px-6 pb-8">
      <form onSubmit={handleSave} className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header summary banner */}
        <div className="content-card">
          <div className="content-card-body flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-active flex items-center justify-center shrink-0">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-txt">Gateway & Mesh Network Configuration</h2>
                <p className="text-[12px] text-txt-secondary">
                  Tune LoRa PHY modulation, bridge interfaces, and emergency disaster parameters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="btn btn-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Defaults
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: LoRa Radio & Physical Layer */}
        <div className="content-card">
          <div className="content-card-header">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-txt" />
              <h3 className="text-[15px] font-bold text-txt">LoRa RF Parameters (Semtech SX1262)</h3>
            </div>
            <span className="badge badge-success">868 MHz ISM Band</span>
          </div>

          <div className="content-card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Carrier Frequency (MHz)
              </label>
              <input
                type="text"
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              />
              <span className="text-[10px] text-txt-secondary mt-1 block">Default: 868.100 MHz (Europe) / 915.000 (US)</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Spreading Factor
              </label>
              <select
                value={spreadingFactor}
                onChange={e => setSpreadingFactor(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              >
                <option value="SF7">SF7 (Fastest data rate, shorter range)</option>
                <option value="SF8">SF8 (Balanced)</option>
                <option value="SF9">SF9 (Recommended for mesh)</option>
                <option value="SF10">SF10 (Extended mountain range)</option>
                <option value="SF11">SF11 (Ultra deep penetration)</option>
                <option value="SF12">SF12 (Maximum range, highest latency)</option>
              </select>
              <span className="text-[10px] text-txt-secondary mt-1 block">Time-on-air vs. sensitivity tradeoff</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Bandwidth (kHz)
              </label>
              <select
                value={bandwidth}
                onChange={e => setBandwidth(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              >
                <option value="125">125 kHz (Standard LoRa)</option>
                <option value="250">250 kHz (High throughput)</option>
                <option value="500">500 kHz (Wideband)</option>
              </select>
              <span className="text-[10px] text-txt-secondary mt-1 block">Receiver bandwidth filter</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Coding Rate
              </label>
              <select
                value={codingRate}
                onChange={e => setCodingRate(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              >
                <option value="4/5">4/5 (Standard error correction)</option>
                <option value="4/6">4/6 (Medium noise protection)</option>
                <option value="4/7">4/7 (Heavy noise protection)</option>
                <option value="4/8">4/8 (Maximum FEC overhead)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Transmission Power (dBm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="14"
                  max="22"
                  value={txPower}
                  onChange={e => setTxPower(e.target.value)}
                  className="flex-1 accent-active"
                />
                <span className="font-mono text-[13px] font-bold text-txt min-w-[50px]">{txPower} dBm</span>
              </div>
              <span className="text-[10px] text-txt-secondary mt-1 block">Max EIRP output power (+22 dBm / 160mW)</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Mesh Protocol Max Hops (TTL)
              </label>
              <input
                type="number"
                defaultValue={7}
                min={1}
                max={15}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              />
              <span className="text-[10px] text-txt-secondary mt-1 block">Maximum router hops before packet expiry</span>
            </div>
          </div>
        </div>

        {/* Section 2: Hardware Gateway Interface */}
        <div className="content-card">
          <div className="content-card-header">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-txt" />
              <h3 className="text-[15px] font-bold text-txt">Gateway Bridge Interface</h3>
            </div>
            <div className="badge badge-success">ESP32 Attached</div>
          </div>

          <div className="content-card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Connection Protocol
              </label>
              <select
                value={interfaceType}
                onChange={e => setInterfaceType(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-medium text-txt outline-none"
              >
                <option value="serial">USB UART Serial (Direct ESP32)</option>
                <option value="websocket">TCP / WebSocket Bridge</option>
                <option value="ble">Bluetooth Low Energy (BLE)</option>
              </select>
            </div>

            {interfaceType === 'serial' ? (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                    Serial Device Port
                  </label>
                  <input
                    type="text"
                    value={serialPort}
                    onChange={e => setSerialPort(e.target.value)}
                    placeholder="COM4 or /dev/ttyUSB0"
                    className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
                  />
                  <span className="text-[10px] text-txt-secondary mt-1 block">CH340 / CP2102 driver port</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                    Baud Rate
                  </label>
                  <select
                    value={baudRate}
                    onChange={e => setBaudRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
                  >
                    <option value="9600">9600 bps</option>
                    <option value="57600">57600 bps</option>
                    <option value="115200">115200 bps (Standard)</option>
                    <option value="921600">921600 bps (High-speed)</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                  WebSocket Server URI
                </label>
                <input
                  type="text"
                  value={wsEndpoint}
                  onChange={e => setWsEndpoint(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Incident Thresholds & Automation */}
        <div className="content-card">
          <div className="content-card-header">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-txt" />
              <h3 className="text-[15px] font-bold text-txt">Alert Thresholds & Response Policies</h3>
            </div>
          </div>

          <div className="content-card-body grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex items-center justify-between p-3.5 bg-surface rounded-btn border border-border">
              <div>
                <div className="text-[13px] font-bold text-txt">Audible SOS Emergency Tone</div>
                <div className="text-[11px] text-txt-secondary">Sound alarm chime on critical incoming distress beacon</div>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={e => setSoundAlerts(e.target.checked)}
                className="w-4 h-4 accent-active"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-surface rounded-btn border border-border">
              <div>
                <div className="text-[13px] font-bold text-txt">Auto-Acknowledge Beacon Heartbeats</div>
                <div className="text-[11px] text-txt-secondary">Automatically reply with ACK packets to preserve node battery</div>
              </div>
              <input
                type="checkbox"
                checked={autoAcknowledge}
                onChange={e => setAutoAcknowledge(e.target.checked)}
                className="w-4 h-4 accent-active"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Low Battery Alarm Threshold (%)
              </label>
              <input
                type="number"
                value={batteryThreshold}
                onChange={e => setBatteryThreshold(e.target.value)}
                min="5"
                max="50"
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Degraded Signal SNR Threshold (dB)
              </label>
              <input
                type="number"
                step="0.5"
                value={snrThreshold}
                onChange={e => setSnrThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-1.5">
                Telemetry Polling Interval (seconds)
              </label>
              <input
                type="number"
                value={pollInterval}
                onChange={e => setPollInterval(e.target.value)}
                min="5"
                max="300"
                className="w-full px-3 py-2 rounded-btn border border-border bg-card text-[13px] font-mono text-txt outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn"
          >
            Reset All
          </button>
          <button
            type="submit"
            className="btn btn-primary px-6"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply & Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

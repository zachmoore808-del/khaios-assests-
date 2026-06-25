const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const os = require('os');
const { autoUpdater } = require('electron-updater');

let launcherWin = null;
let mainWin = null;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

function createLauncher() {
  launcherWin = new BrowserWindow({
    width: 760,
    height: 460,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#02030a',
    webPreferences: { preload: path.join(__dirname, 'launcher-preload.js') }
  });
  launcherWin.loadFile('launcher.html');
}

function createMain() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#02030a',
    autoHideMenuBar: true,
    title: 'KHAIOS',
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'bridge-preload.js')
    }
  });
  mainWin.loadURL('https://zachmoore808-del.github.io/khaios-assests-/app.html');
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWin.once('ready-to-show', () => {
    mainWin.show();
    if (launcherWin && !launcherWin.isDestroyed()) { launcherWin.close(); }
    launcherWin = null;
  });
}

function send(channel, data) {
  if (launcherWin && !launcherWin.isDestroyed()) {
    launcherWin.webContents.send(channel, data);
  }
}

function launchApp() {
  if (mainWin) return;
  send('status', { state: 'launching', text: 'Launching KHAIOS...' });
  createMain();
}

function startUpdateFlow() {
  if (!app.isPackaged) {
    send('status', { state: 'dev', text: 'Developer mode \u2014 skipping update check' });
    setTimeout(launchApp, 1400);
    return;
  }
  send('status', { state: 'checking', text: 'Checking for updates...' });

  autoUpdater.on('update-available', (info) => {
    send('status', { state: 'available', text: 'Update found \u2014 downloading v' + info.version });
  });
  autoUpdater.on('update-not-available', () => {
    send('status', { state: 'latest', text: 'You are up to date' });
    setTimeout(launchApp, 1100);
  });
  autoUpdater.on('download-progress', (p) => {
    send('progress', { percent: p.percent, speed: p.bytesPerSecond, transferred: p.transferred, total: p.total });
  });
  autoUpdater.on('update-downloaded', () => {
    send('status', { state: 'installing', text: 'Installing update...' });
    setTimeout(() => autoUpdater.quitAndInstall(false, true), 1600);
  });
  autoUpdater.on('error', () => {
    send('status', { state: 'error', text: 'Update check failed \u2014 launching anyway' });
    setTimeout(launchApp, 1600);
  });

  autoUpdater.checkForUpdates().catch(() => {});
}

ipcMain.handle('khaios:version', () => app.getVersion());
ipcMain.handle('khaios:systemInfo', () => {
  const c = os.cpus() || [];
  return {
    platform: process.platform,
    arch: process.arch,
    cpuModel: (c[0] || {}).model || 'unknown',
    cpuCount: c.length,
    totalMemGB: +(os.totalmem() / 1073741824).toFixed(1),
    freeMemGB: +(os.freemem() / 1073741824).toFixed(1),
    hostname: os.hostname(),
    osRelease: os.release()
  };
});
ipcMain.handle('khaios:notify', (e, payload) => {
  try {
    new Notification({
      title: String((payload && payload.title) || 'KHAIOS'),
      body: String((payload && payload.body) || '')
    }).show();
    return true;
  } catch (err) {
    return false;
  }
});

app.whenReady().then(() => {
  createLauncher();
  setTimeout(startUpdateFlow, 1000);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createLauncher();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('launcher-ready', () => {});
ipcMain.on('launcher-quit', () => { app.quit(); });

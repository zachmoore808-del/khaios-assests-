const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('updater', {
  onStatus: (cb) => ipcRenderer.on('status', (e, d) => cb(d)),
  onProgress: (cb) => ipcRenderer.on('progress', (e, d) => cb(d)),
  ready: () => ipcRenderer.send('launcher-ready'),
  quit: () => ipcRenderer.send('launcher-quit')
});

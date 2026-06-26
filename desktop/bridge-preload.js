const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('khaios', {
  isDesktop: true,
  platform: process.platform,
  version: () => ipcRenderer.invoke('khaios:version'),
  systemInfo: () => ipcRenderer.invoke('khaios:systemInfo'),
  notify: (title, body) => ipcRenderer.invoke('khaios:notify', { title: title, body: body }),
  openGameWindow: (url) => ipcRenderer.invoke('khaios:openGameWindow', url)
});

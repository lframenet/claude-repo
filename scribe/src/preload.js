'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scribe', {
  openDialog: () => ipcRenderer.invoke('dialog:open'),
  saveDialog: (defaultName) => ipcRenderer.invoke('dialog:save', defaultName),
  readFile: (p) => ipcRenderer.invoke('fs:read', p),
  writeFile: (p, text) => ipcRenderer.invoke('fs:write', { path: p, text }),
  exists: (p) => ipcRenderer.invoke('fs:exists', p),
  reveal: (p) => ipcRenderer.invoke('shell:reveal', p),
  recent: () => ipcRenderer.invoke('recent:get'),
  addRecent: (p) => ipcRenderer.invoke('doc:addRecent', p),
  setRepresented: (p) => ipcRenderer.invoke('win:setRepresented', p),
  setEdited: (b) => ipcRenderer.invoke('win:setEdited', b),
  onMenu: (cb) => ipcRenderer.on('menu', (_e, action) => cb(action)),
  onOpenPath: (cb) => ipcRenderer.on('open-path', (_e, p) => cb(p)),
  onOpenPaths: (cb) => ipcRenderer.on('open-paths', (_e, ps) => cb(ps)),
});

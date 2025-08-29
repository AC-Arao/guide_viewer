const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const url = process.env.DEMO_URL || 'http://localhost:8123?preview=1';
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    alwaysOnTop: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f1115',
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

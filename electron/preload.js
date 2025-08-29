const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose a safe API for the renderer to read guide.md directly from disk
contextBridge.exposeInMainWorld('demoViewer', {
  readGuideMd: () => {
    return new Promise((resolve, reject) => {
      // Resolve guide.md relative to project root (../guide.md from electron/)
      const mdPath = path.resolve(__dirname, '..', 'guide.md');
      fs.readFile(mdPath, 'utf8', (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }
});

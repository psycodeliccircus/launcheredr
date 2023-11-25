const { app, BrowserWindow, nativeTheme, ipcMain, Menu, Tray, nativeImage, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const MainMenuapp = require('./menu-config')
const appConfig = require('./config');

// Adicione esta linha para importar o módulo protocol
const protocol = require('electron').protocol;

let mainWindow;
let tray = null;

// Menu
let mainMenu = Menu.buildFromTemplate(MainMenuapp)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: appConfig.width,
    height: appConfig.height,
    minWidth: appConfig.minWidth,
    minHeight: appConfig.minHeight,
    icon: "build/icon.ico",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  // Registrar protocolo personalizado 'edr'
  protocol.registerHttpProtocol('edr', (request, callback) => {
    const url = request.url.substr(6); // Remover 'edr://'
    handleCustomProtocol(url);
  });

  Menu.setApplicationMenu(mainMenu)

  mainWindow.maximize();

  loadWebContent();

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://launcher.elitedarodagem.online')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  tray = new Tray(createTrayIcon('logo_tray.png'));

  const contextMenu = createTrayContextMenu();
  tray.setToolTip(appConfig.appName);
  tray.setContextMenu(contextMenu);

  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.show();
    setActivity();
    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
    autoUpdater.checkForUpdates();
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });
}

function loadWebContent() {
  mainWindow.loadFile(path.join(__dirname, 'public/loading.html'));

  let wc = mainWindow.webContents;

  wc.once('did-finish-load', () => {
    mainWindow.loadURL(appConfig.websiteUrl);
  });

  wc.on('did-fail-provisional-load', (error, code) => {
    mainWindow.loadFile(path.join(__dirname, 'public/offline.html'));
  });
}

ipcMain.on('online-status-changed', (event, status) => {
  if (status == true) {
    loadWebContent();
  }
});

function handleCustomProtocol(url) {
  if (url === 'home') {
    loadWebContent();
  } else {
    mainWindow.loadFile(path.join(__dirname, `public/${url}.html`));
  }
  // Adicione mais casos conforme necessário
}

module.exports = (pageId) => {
  if (pageId === 'home') {
    loadWebContent();
  } else {
    mainWindow.loadFile(path.join(__dirname, `public/${pageId}.html`));
  }
};

function createTrayContextMenu() {
  return Menu.buildFromTemplate([
    { label: `${appConfig.appName} v${app.getVersion()}`, icon: createTrayIcon('logo_tray.png'), click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Atualização', icon: createTrayIcon('update.png'), click: () => autoUpdater.checkForUpdates() },
    { type: 'separator' },
    { label: 'Fechar', icon: createTrayIcon('close.png'), click: () => app.quit() },
  ]);
}

function createTrayIcon(iconName) {
  return nativeImage.createFromPath(path.join(__dirname, 'public', iconName)).resize({ width: 16 });
}

function setActivity() {

  const client = require('discord-rich-presence')('1165771580832501912')
  client.on("error", _ => true);

  // discordClient
  client.on('connected', () => {
      startTimestamp = new Date();
      client.updatePresence({
          state: "Elite da Rodagem",
          details: "Server ETS2/ATS",
          startTimestamp,
          largeImageKey: "logo",
          instance: true,
          buttons: [
              { "label": "Discord Oficial", "url": "https://elitedarodagem.online/discord/invite/WebSite/" },
              { "label": "Forum", "url": "https://elitedarodagem.online/" }
          ]
      });

      setInterval(() => { 
          client.updatePresence({
              state: "Elite da Rodagem",
              details: "Server ETS2/ATS",
              startTimestamp,
              largeImageKey: 'logo',
              largeImageText: "Community",
              smallImageKey: 'online',
              smallImageText: "Você esta online!",
              instance: true,
              buttons: [
                { "label": "Discord Oficial", "url": "https://elitedarodagem.online/discord/invite/WebSite/" },
                { "label": "Forum", "url": "https://elitedarodagem.online/" }
              ]
          });
      }, 35500);
  });
}

// Funções de tratamento de atualizações
function handleUpdateChecking() {
  log.log('Checking for updates.');
}

function handleUpdateAvailable(info) {
  log.log('Update available.');
}

function handleDownloadProgress(progressObj) {
  const message = `Downloading update. Speed: ${progressObj.bytesPerSecond} - ${~~progressObj.percent}% [${progressObj.transferred}/${progressObj.total}]`;
  log.log(message);

  const swalMessage = `Swal.fire({
    title: 'Baixando atualização',
    html: '${message}',
    allowOutsideClick: false,
    onBeforeOpen: () => {
        Swal.showLoading();
    }
  });`;

  mainWindow.webContents.executeJavaScript(swalMessage);
}

function handleUpdateError(err) {
  log.log(`Update check failed: ${err.toString()}`);
}

function handleUpdateNotAvailable(info) {
  const swalMessage = `Swal.fire({
    title: 'Atualizações',
    html: 'Não há atualizações disponíveis.',
    icon: 'error'
  });`;

  mainWindow.webContents.executeJavaScript(swalMessage);
}

function handleUpdateDownloaded(info) {
  const swalMessage = `Swal.fire({
    title: 'Reiniciando o aplicativo',
    html: 'Aguente firme, reiniciando o aplicativo para atualização!',
    allowOutsideClick: false,
    onBeforeOpen: () => {
        Swal.showLoading();
    }
  });`;

  mainWindow.webContents.executeJavaScript(swalMessage);
  autoUpdater.quitAndInstall();
}

autoUpdater.on('checking-for-update', handleUpdateChecking);
autoUpdater.on('update-available', handleUpdateAvailable);
autoUpdater.on('download-progress', handleDownloadProgress);
autoUpdater.on('error', handleUpdateError);
autoUpdater.on('update-not-available', handleUpdateNotAvailable);
autoUpdater.on('update-downloaded', handleUpdateDownloaded);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


const {app, BrowserWindow, nativeTheme, ipcMain, Menu, Tray, nativeImage, dialog, shell} = require('electron')
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path')
const appConfig = require('./config')

let mainWindow;
let tray = null;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: appConfig['width'],
    height: appConfig['height'],
    minWidth: appConfig['minWidth'],
    minHeight: appConfig['minHeight'],
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    }
  })

  mainWindow.setMenu(null);

  //mainWindow.maximize();

  loadWebContent()

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://launcher.elitedarodagem.online')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'public/logo_tray.png'));
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: appConfig['appName'] +' v' + app.getVersion(),
      icon: nativeImage.createFromPath(__dirname + '/public/logo_tray.png').resize({ width: 16 }),
      click: () => mainWindow.show() 
    },
    { type: 'separator' },
    { 
      label: 'Sobre',
      icon: nativeImage.createFromPath(__dirname + '/public/sobre.png').resize({ width: 16 }),  
      click: () => { require('./main')("about") } 
    },
    { type: 'separator' },
    { 
      label: 'Atualização',
      icon: nativeImage.createFromPath(__dirname + '/public/update.png').resize({ width: 16 }), 
      click() { autoUpdater.checkForUpdates() } 
    },
    { type: 'separator' },
    { 
      label: 'Abrir', 
      icon: nativeImage.createFromPath(__dirname + '/public/maxi.png').resize({ width: 16 }),
      click: () => mainWindow.show() 
    },
    { type: 'separator' },
    { 
      label: 'Minimizar', 
      icon: nativeImage.createFromPath(__dirname + '/public/mini.png').resize({ width: 16 }),
      click: () => mainWindow.minimize() 
    },
    { type: 'separator' },
    { 
      label: 'Fechar',
      icon: nativeImage.createFromPath(__dirname + '/public/close.png').resize({ width: 16 }), 
      click: () => app.quit() 
    }
  ]);

  tray.setToolTip(appConfig['appName']);
  tray.setContextMenu(contextMenu);

  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.show()
    setActivity()
    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    })
    autoUpdater.checkForUpdates()
  })

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
  mainWindow.loadFile(path.join(__dirname, 'public/loading.html'))

  let wc = mainWindow.webContents

  wc.once('did-finish-load'  ,  () => {
    mainWindow.loadURL(appConfig['websiteUrl'])
  })

  wc.on('did-fail-provisional-load', (error, code)=> {
    mainWindow.loadFile(path.join(__dirname, 'public/offline.html'))
  })
}

ipcMain.on('online-status-changed', (event, status) => {
  if(status == true) { loadWebContent() }
})

module.exports = (pageId) => {
  if(pageId === 'home') {
    loadWebContent()
  } else {
    mainWindow.loadFile(path.join(__dirname, `public/${pageId}.html`))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function setActivity() {

/*  const client = require('discord-rich-presence')('1165497253855772694')
  client.on("error", _ => true);

  // discordClient
  client.on('connected', () => {
      startTimestamp = new Date();
      client.updatePresence({
          state: "Community",
          startTimestamp,
          largeImageKey: "logo",
          instance: true,
          buttons: [
              { "label": "Website", "url": "https://renildomarcio.com.br" },
              { "label": "Forum", "url": "https://community.renildomarcio.com.br" }
          ]
      });

      setInterval(() => { 
          client.updatePresence({
              state: "Community",
              startTimestamp,
              largeImageKey: 'logo',
              largeImageText: "Community",
              smallImageKey: 'online',
              smallImageText: "Você esta online!",
              instance: true,
              buttons: [
                { "label": "Website", "url": "https://renildomarcio.com.br" },
                { "label": "Forum", "url": "https://community.renildomarcio.com.br" }
              ]
          });
      }, 35500);
  });*/
}


function handleUpdateChecking() {
  log.log("Checking for updates.");
}

function handleUpdateAvailable(info) {
  log.log("Update available.");
}

function handleDownloadProgress(progressObj) {
  const message = `Downloading update. Speed: ${progressObj.bytesPerSecond} - ${~~progressObj.percent}% [${progressObj.transferred}/${progressObj.total}]`;

  log.log(message);

  mainWindow.webContents.executeJavaScript(`
    Swal.fire({
      title: 'Baixando atualização',
      html: '${message}',
      allowOutsideClick: false,
      onBeforeOpen: () => {
          Swal.showLoading();
      }
    });
  `);
}

function handleUpdateError(err) {
  log.log(`Update check failed: ${err.toString()}`);
}

function handleUpdateNotAvailable(info) {
  log.log("Update not available.");

  mainWindow.webContents.executeJavaScript(`
    Swal.fire({
      title: 'Atualizações',
      html: 'Não há atualizações disponíveis.',
      icon: 'error'
    });
  `);
}

function handleUpdateDownloaded(info) {
  mainWindow.webContents.executeJavaScript(`
    Swal.fire({
      title: 'Reiniciando o aplicativo',
      html: 'Aguente firme, reiniciando o aplicativo para atualização!',
      allowOutsideClick: false,
      onBeforeOpen: () => {
          Swal.showLoading();
      }
    });
  `);

  autoUpdater.quitAndInstall();
}

autoUpdater.on('checking-for-update', handleUpdateChecking);
autoUpdater.on('update-available', handleUpdateAvailable);
autoUpdater.on('download-progress', handleDownloadProgress);
autoUpdater.on('error', handleUpdateError);
autoUpdater.on('update-not-available', handleUpdateNotAvailable);
autoUpdater.on('update-downloaded', handleUpdateDownloaded);


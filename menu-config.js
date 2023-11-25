const { app, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

module.exports = [
    {
        label: 'Menu',
        submenu: [
            {
                label: 'Home',
                click: () => { require('./main')("home") }
            },
            {
                label: "Sair",
                click: () => app.quit()
            },
        ]
    },
    {
        label: 'Atualização',
        submenu: [
            {
                label: 'Verificar atualizações',
                click: () => {
                    autoUpdater.checkForUpdates()
                },
            }
        ]
    },
]
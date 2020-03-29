// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import path from "path";

let mainWindow: BrowserWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../views", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.exit(0);
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// handle createBrowserWindow in main process
ipcMain.handle(
  "createBrowserWindow",
  (
    e: Electron.IpcMainInvokeEvent,
    options: Electron.BrowserWindowConstructorOptions = {}
  ) => {
    if (options.modal) {
      options.parent = mainWindow || null;
    }
    let browserWindow = new BrowserWindow(options);
    let id = browserWindow.id;

    ipcMain.handle(
      `${id}_show`,
      (
        event: Electron.IpcMainInvokeEvent,
        showOptions: { focused: boolean }
      ) => {
        if (showOptions.focused) {
          browserWindow.show();
        } else {
          browserWindow.showInactive();
        }
      }
    );

    ipcMain.handle(`${id}_close`, () => {
      browserWindow.close();
    });

    ipcMain.handle(
      `${id}_loadURL`,
      (event: Electron.IpcMainInvokeEvent, url: string): Promise<void> => {
        return browserWindow.loadURL(url);
      }
    );

    ipcMain.handle(
      `${id}_send`,
      (event: Electron.IpcMainInvokeEvent, channel: string, ...args: any[]) => {
        browserWindow.webContents.send(channel, id, ...args);
      }
    );

    ipcMain.on(`${id}_message`, (event: IpcMainEvent, ...args: any[]) => {
      mainWindow.webContents.send(`${id}_message`, ...args);
    });

    browserWindow.on("closed", () => {
      if (mainWindow) mainWindow.webContents.send(`${id}_closed`);
      ipcMain.removeHandler(`${id}_show`);
      ipcMain.removeHandler(`${id}_close`);
      ipcMain.removeHandler(`${id}_loadURL`);
      ipcMain.removeHandler(`${id}_send`);
      ipcMain.removeAllListeners(`${id}_message`);
      browserWindow = null;
      id = null;
    });

    return browserWindow.id;
  }
);

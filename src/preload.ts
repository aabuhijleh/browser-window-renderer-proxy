import { ipcRenderer } from "electron";
import { EventEmitter } from "events";
import path from "path";

// use this function to create and manage browserWindows from this renderer process
async function createBrowserWindow(
  options: Electron.BrowserWindowConstructorOptions = {}
): Promise<IBrowserWindowRendererProxy> {
  const id: number = await ipcRenderer.invoke(`createBrowserWindow`, options);
  return new BrowserWindowRendererProxy(id);
}

interface IBrowserWindowRendererProxy extends EventEmitter {
  id: number;
  show(options?: { focused?: boolean }): Promise<void>;
  close(): Promise<void>;
  loadURL(url: string): Promise<void>;
  send(channel: string, ...args: any[]): Promise<void>;
}

class BrowserWindowRendererProxy extends EventEmitter
  implements IBrowserWindowRendererProxy {
  public id: number = null;

  constructor(id: number) {
    super();
    this.id = id;

    ipcRenderer.on(`${this.id}_message`, (event, ...args: any[]) => {
      this.emit("message", ...args);
    });

    ipcRenderer.once(`${this.id}_closed`, () => {
      ipcRenderer.removeAllListeners(`${this.id}_message`);
      this.emit("closed");
    });
  }

  public async show(options = { focused: true }): Promise<void> {
    return ipcRenderer.invoke(`${this.id}_show`, options);
  }

  public async close(): Promise<void> {
    return ipcRenderer.invoke(`${this.id}_close`);
  }

  public async loadURL(url: string): Promise<void> {
    return ipcRenderer.invoke(`${this.id}_loadURL`, url);
  }

  public async send(channel: string, ...args: any[]): Promise<void> {
    return ipcRenderer.invoke(`${this.id}_send`, channel, ...args);
  }
}

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }

  document.getElementById("child").addEventListener("click", async () => {
    // example usage of createBrowserWindow
    let testWindow: IBrowserWindowRendererProxy = await createBrowserWindow({
      width: 300,
      height: 300,
      show: false,
      modal: true,
      webPreferences: {
        nodeIntegration: true
      }
    });

    testWindow.on("message", msg => {
      console.log("message", msg);
    });

    console.log("loading");
    await testWindow.loadURL(
      "file://" + path.join(__dirname, "../views", "test.html")
    );
    console.log("loaded");

    console.log("initializing");
    await testWindow.send("initialize", { content: "Hello World" });
    console.log("initialized");

    console.log("showing");
    await testWindow.show();
    console.log("showed");

    // setTimeout(() => {
    //   console.log("closing");
    //   testWindow.close();
    // }, 2000);

    testWindow.once("closed", () => {
      console.log("closed");
      testWindow = null;
    });
  });
});

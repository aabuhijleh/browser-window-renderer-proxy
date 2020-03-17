import { ipcRenderer } from "electron";
import { EventEmitter } from "events";

// use this function to create and manage browserWindows from this renderer process
async function createBrowserWindow(
  options: Electron.BrowserWindowConstructorOptions = {}
): Promise<BrowserWindowRendererProxy> {
  const id: number = await ipcRenderer.invoke(`createBrowserWindow`, options);
  return new BrowserWindowRendererProxy(id);
}

interface IBrowserWindowRendererProxy extends EventEmitter {
  id: number;
  show(): Promise<void>;
  close(): Promise<void>;
}

class BrowserWindowRendererProxy extends EventEmitter
  implements IBrowserWindowRendererProxy {
  public id: number = null;

  constructor(id: number) {
    super();
    this.id = id;

    ipcRenderer.once(`${this.id}_closed`, () => {
      this.emit("closed");
    });
  }

  public async show(): Promise<void> {
    return ipcRenderer.invoke(`${this.id}_show`);
  }

  public async close(): Promise<void> {
    return ipcRenderer.invoke(`${this.id}_close`);
  }
}

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", async () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }

  // example usage of createBrowserWindow
  let testWindow: IBrowserWindowRendererProxy = await createBrowserWindow({
    width: 200,
    height: 200,
    show: false
  });

  console.log("showing");
  await testWindow.show();
  console.log("showed");

  setTimeout(() => {
    console.log("closing");
    testWindow.close();
  }, 2000);

  testWindow.once("closed", () => {
    console.log("closed");
    testWindow = null;
  });
});

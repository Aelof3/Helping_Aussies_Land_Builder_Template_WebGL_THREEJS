import * as DATGUI from './lib/dat.gui.module.js';

const pendingBuildFunctions = [];

let gui, folders;

// Helper function to safely bind stuff to the GUI.
// Calls the provided function immediately if loaded.
// Otherwise, it will just add it to the list for later execution.
export function buildGUI(buildFunction) {
  if (gui) {
    buildFunction(gui, folders);
  } else {
    pendingBuildFunctions.push(buildFunction);
  }
}

export function initialiseGui() {
  gui = new DATGUI.GUI();

  // Modify the function for adding items so that default parameters are automatically "remembered",
  // because having to call gui.remember() every time you add an item is dumb.
  // This allows for the entire state to be saved, loaded, and reset.
  const addFunc = gui.add;
  gui.add = (...args) => {
    const params = args[0];
    gui.remember(params);
    return addFunc.bind(gui)(...args);
  };

  // Do the same for items in folders when they are created (and also force them to expand).
  // This does not work for nested folders, so if we ever add those this would get more complicated.
  const addFolderFunc = gui.addFolder;
  gui.addFolder = (...args) => {
    const folder = addFolderFunc.bind(gui)(...args);

    const folderAddFunc = folder.add;
    folder.add = (...args) => {
      const params = args[0];
      gui.remember(params);
      return folderAddFunc.bind(folder)(...args);
    };

    // Expand folder
    folder.open();
    return folder;
  };

  // Create folders
  folders = {
    rendering: gui.addFolder('Rendering'),
    scene: gui.addFolder('Scene'),
    terrain: gui.addFolder('Terrain'),
    water: gui.addFolder('Water'),
    lighting: gui.addFolder('Lighting'),
    particles: gui.addFolder('Particles'),
    creatures: gui.addFolder('Creatures')
  };

  // Run all the functions passed to buildGUI
  pendingBuildFunctions.forEach((buildFunction) => buildFunction(gui, folders));
}

import { initApp } from "./app.js";
import { initChat } from "./chat.js";
import { initPwa } from "./pwa.js";

const { showToast } = initApp();
initChat({ showToast });
initPwa();

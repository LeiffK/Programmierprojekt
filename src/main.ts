import { createApp } from "vue";
//eigenes kleines „design system“
import "./styles/tokens.css";
import "./styles/utilities.css";
import "./styles/motion.css";
import "shepherd.js/dist/css/shepherd.css"; // Shepherd-Styles global
import App from "./App.vue";

createApp(App).mount("#app");

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsnZgiZbmF3500QzDSP7zatmSbVbWmKQY",
  authDomain: "soraya-arruda-sistema.firebaseapp.com",
  projectId: "soraya-arruda-sistema",
  storageBucket: "soraya-arruda-sistema.firebasestorage.app",
  messagingSenderId: "301467148983",
  appId: "1:301467148983:web:1316dd8ccfe0ee40cae332"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
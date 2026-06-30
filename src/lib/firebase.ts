// Import the functions you need from the SDKs you need
// Provide a minimal module declaration to avoid TS errors when firebase types are not installed
declare module "firebase/app" {
  // minimal typing for initializeApp used in this file
  export function initializeApp(config: any): any;
}
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXNVMpshwho3fF9I8lhrntetW512b3-8s",
  authDomain: "sree-kumaran-edge.firebaseapp.com",
  databaseURL: "https://sree-kumaran-edge-default-rtdb.firebaseio.com",
  projectId: "sree-kumaran-edge",
  storageBucket: "sree-kumaran-edge.firebasestorage.app",
  messagingSenderId: "565085839711",
  appId: "1:565085839711:web:6deaa0a1e904a8748c56ea",
  measurementId: "G-83FGL7P5DY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
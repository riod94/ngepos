import Dexie from "dexie";
console.log("Instantiating Dexie...");
const db = new Dexie("test_db");
console.log("Success!");

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { exec } = require("child_process");
const path = require("path");

// Firebase Service Account Key-ai load pannu
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

// Pudhu modular method-la Firebase-ai initialize pannu
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://console.firebase.google.com"
});

// Database-ai thaniya edukkanum
const db = getDatabase(app);
const printRef = db.ref("print_jobs");

console.log("Printer Relay is running and waiting for orders...");

// Order-ai monitor pannum
printRef.on("child_added", (snapshot) => {
  const data = snapshot.val();
  
  if (data && data.receipt_html) {
    console.log("New Bill Detected! Printing...");

    // Windows PowerShell command-ai generate pannum
    const command = `powershell -Command "$html = @'
${data.receipt_html}
'@; $path = 'C:\\temp_receipt.html'; $html | Out-File -FilePath $path -Encoding utf8; Start-Process -FilePath $path -Verb Print"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Printer Error: ${error.message}`);
        return;
      }
      console.log("Print command sent successfully!");
      
      // Order print aagiduchuna database-la irundhu remove pannum
      snapshot.ref.remove();
    });
  }
});
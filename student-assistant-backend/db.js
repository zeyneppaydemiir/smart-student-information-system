// Bu dosya JSON dosyalarini okuyup yazmak icin kullaniliyor
// Veritabani kullanmadim cunku odev icin gerek yok, JSON yeterli

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

// JSON dosyasini oku
function readData(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.log("Dosya okunamadi:", fileName, err.message);
    return null;
  }
}

// JSON dosyasina yaz
function writeData(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.log("Dosya yazilamadi:", fileName, err.message);
    return false;
  }
}

module.exports = { readData, writeData };

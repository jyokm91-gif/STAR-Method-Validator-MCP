import fs from 'fs';

try {
  const rawData = fs.readFileSync('C:\\Users\\jyokm\\OneDrive\\Desktop\\coverletter\\cover_letters_formatted_linkcareer.json', 'utf8');
  const data = JSON.parse(rawData);
  console.log("Total entries:", data.length);
  console.log("Sample:", data[0].content.substring(0, 50));
} catch (error) {
  console.error("Error:", error.message);
}

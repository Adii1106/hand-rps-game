const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5050;

app.use(express.json({ limit: '10mb' }));

app.post('/api/save-image', (req, res) => {
  const { gesture, imageData } = req.body;
  if (!gesture || !imageData) {
    return res.status(400).json({ error: 'Missing gesture or imageData' });
  }
  // Extract base64 data
  const base64Data = imageData.replace(/^data:image\/(png|jpeg);base64,/, "");
  const folder = path.join(__dirname, 'data', gesture);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  const filename = `Image_${Date.now()}.png`;
  const filepath = path.join(folder, filename);
  fs.writeFile(filepath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Failed to save image:', err);
      return res.status(500).json({ error: 'Failed to save image' });
    }
    res.json({ success: true, filename });
  });
});

app.get('/api/image-counts', (req, res) => {
  const gestures = ['Rock', 'Paper', 'Scissors'];
  const counts = {};
  gestures.forEach(gesture => {
    const folder = path.join(__dirname, 'data', gesture);
    try {
      counts[gesture] = fs.existsSync(folder)
        ? fs.readdirSync(folder).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')).length
        : 0;
    } catch {
      counts[gesture] = 0;
    }
  });
  res.json(counts);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
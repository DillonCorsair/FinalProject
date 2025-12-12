# Album Poster Design Hub

A web application for creating custom music album posters with color palettes, lyrics, and typography.

## 🌐 Live Demo

[View Live Site](https://your-app-name.onrender.com) *(Update this URL after deployment)*

## Features

### Visual Design
- Modern, polished UI with responsive design
- Real-time poster preview
- Multiple layout options (A, B, C)
- Customizable font selection from Google Fonts
- Dynamic color palette extraction from images

### Functionality
- **Album Information**: Fetch album data from Discogs API
- **Lyrics Integration**: Select and display song lyrics
- **Color Palette**: Extract 5-color palettes from uploaded images
- **Poster Gallery**: Save, view, edit, and export posters
- **Responsive Design**: Works on desktop and mobile (portrait/landscape)
- **Export**: Download posters as PNG images

### Customization Options
- Size: Paper, Tabloid, Phone, Desktop
- Orientation: Vertical, Horizontal
- Layout: Three different element arrangements
- Colors: Background, Text, Accent
- Font: Multiple Google Fonts
- Scale: Adjustable track list font size
- Text: Album description or lyric excerpts

## Project Structure

```
final-website/
├── index.html          # Main application page
├── gallery.html        # Gallery page
├── styles.css          # Main stylesheet
├── gallery.css         # Gallery-specific styles
├── script.js           # Main application logic
├── gallery.js          # Gallery functionality
├── server.js           # Express server (API proxy)
├── openai-service.js   # OpenAI integration
├── package.json        # Dependencies
└── README.md           # This file
```

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/album-poster-design-hub.git
   cd album-poster-design-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create `apiKey.env` in the root directory with:
   ```
   OPENAI_API_KEY=your_openai_key_here
   DISCOGS_TOKEN=your_discogs_token_here
   DISCOGS_SECRET=your_discogs_secret_here
   DISCOGS_ACCESS_TOKEN=your_access_token_here
   DISCOGS_ACCESS_TOKEN_SECRET=your_access_token_secret_here
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Visit the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

This project is configured for deployment on [Render.com](https://render.com) or similar Node.js hosting services.

### Environment Variables Required:
- `OPENAI_API_KEY`
- `DISCOGS_TOKEN`
- `DISCOGS_SECRET`
- `DISCOGS_ACCESS_TOKEN`
- `DISCOGS_ACCESS_TOKEN_SECRET`
- `PORT` (optional, defaults to 3000)

See `DEPLOYMENT.md` for detailed deployment instructions.

## Technical Details

### API Integrations
- **Discogs API**: Album information, track lists, release dates
- **OpenAI API**: Album descriptions and metadata
- **Google Fonts API**: Typography selection
- **Image Proxy**: CORS handling for external images

### Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **APIs**: Discogs, OpenAI, Google Fonts
- **Storage**: localStorage (for gallery)

### Browser Compatibility
Works in all modern browsers (Chrome, Firefox, Safari, Edge).

## License

This project is for educational purposes.

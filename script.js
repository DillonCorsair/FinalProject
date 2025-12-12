// API Configuration
const CORS_PROXY = 'https://corsproxy.io/?';

// Helper function to get the API base URL
// Works for both development (file://, localhost) and production (live URL)
function getApiBaseUrl() {
    // If running from file:// protocol, use localhost:3000
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000';
    }
    // If running on localhost (development), use localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // For production (live URL), use relative URLs (same domain)
    // This works because the Express server serves both static files and API endpoints
    return '';
}

// OpenAI Integration
// Note: For client-side usage, you'll need to create a backend API endpoint
// to securely handle the API key. See openai-service.js for server-side implementation.
let openaiClient = null;

// Initialize OpenAI (client-side - requires backend proxy)
async function initializeOpenAI() {
    // For client-side, you would call your backend API instead
    // This is a placeholder - implement a backend endpoint for production
    try {
        // Example: const response = await fetch('/api/openai', { ... });
        console.log('OpenAI integration ready (requires backend API endpoint)');
    } catch (error) {
        console.error('Failed to initialize OpenAI:', error);
    }
}

// Generate text using OpenAI (client-side wrapper)
async function generateTextWithOpenAI(input, options = {}) {
    try {
        // Determine the API base URL using helper function
        const apiBaseUrl = getApiBaseUrl();
        const apiUrl = `${apiBaseUrl}/api/generate`;
        
        console.log('Calling API at:', apiUrl);
        
        // Call your backend API endpoint that uses openai-service.js
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: input,
                reasoning: options.reasoning || { effort: "low" },
                text: options.text || { verbosity: "low" }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API response error:', errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.output_text;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        // Fallback or show error to user
        throw error;
    }
}

// Example usage function matching your requested format
async function exampleOpenAIUsage() {
    try {
        const result = await generateTextWithOpenAI("Write a haiku about code.", {
            reasoning: { effort: "low" },
            text: { verbosity: "low" }
        });
        console.log(result);
        return result;
    } catch (error) {
        console.error('Error:', error);
    }
}

// State Management
let currentLyrics = '';
let currentArtist = '';
let currentTitle = '';
let currentPalette = [];
let currentFont = 'Roboto';
let pendingImageSource = null; // Store image source until CREATE button is clicked
let accentColorInitialized = false; // Track if accent color has been set from palette
let currentAlbumData = {
    tracks: [],
    releaseDate: '',
    runtime: '',
    description: ''
};
let currentTextType = 'description'; // 'description', 'lyrics', or 'none'
let currentLyricsData = null; // Store full lyrics data with timestamps
let selectedLyricsLines = []; // Store selected lyric lines
let currentSelectedSong = ''; // Store currently selected song name

// Cache for album data to prevent inconsistent results
const albumDataCache = new Map();

// Utility function to fit text to a specific container width
function fitTextToContainer(element, maxWidth, minFontSize = 12) {
    if (!element || !maxWidth) return;
    
    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontFamily = window.getComputedStyle(element).fontFamily;
    tempSpan.style.fontWeight = window.getComputedStyle(element).fontWeight;
    tempSpan.style.fontStyle = window.getComputedStyle(element).fontStyle;
    tempSpan.textContent = element.textContent;
    document.body.appendChild(tempSpan);
    
    // Binary search for optimal font-size
    let min = minFontSize;
    let max = maxWidth * 2; // Reasonable upper bound
    let optimalSize = min;
    
    // Binary search within the range
    while (max - min > 1) {
        const mid = Math.floor((min + max) / 2);
        tempSpan.style.fontSize = mid + 'px';
        const textWidth = tempSpan.offsetWidth;
        
        if (textWidth <= maxWidth) {
            optimalSize = mid;
            min = mid; // Try larger
        } else {
            max = mid; // Too large, try smaller
        }
    }
    
    // Clean up
    document.body.removeChild(tempSpan);
    
    // Apply the optimal font-size
    element.style.fontSize = optimalSize + 'px';
    
    return optimalSize;
}

// Utility function to make text fit on one line by adjusting font-size
function fitTextToLine(element, minFontSize = 12) {
    if (!element) return;
    
    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontFamily = window.getComputedStyle(element).fontFamily;
    tempSpan.style.fontWeight = window.getComputedStyle(element).fontWeight;
    tempSpan.style.fontStyle = window.getComputedStyle(element).fontStyle;
    tempSpan.textContent = element.textContent;
    document.body.appendChild(tempSpan);
    
    // Get container width
    const container = element.parentElement;
    const containerWidth = container.clientWidth;
    
    // Binary search for optimal font-size (no max limit)
    let min = minFontSize;
    // Start with a very large max to find the true maximum
    // Font-size can be much larger than container width (text width != font-size)
    let max = containerWidth * 10; // Start very large
    let optimalSize = min;
    
    // First, find an upper bound that's too large
    tempSpan.style.fontSize = max + 'px';
    while (tempSpan.offsetWidth > containerWidth && max > min) {
        max = Math.floor(max / 2);
        tempSpan.style.fontSize = max + 'px';
    }
    
    // If we found a size that fits, use it as starting point
    if (tempSpan.offsetWidth <= containerWidth) {
        optimalSize = max;
        min = max;
        // Now expand upward to find the true maximum
        let testSize = max * 2;
        while (testSize > min) {
            tempSpan.style.fontSize = testSize + 'px';
            if (tempSpan.offsetWidth <= containerWidth) {
                optimalSize = testSize;
                min = testSize;
                testSize = Math.floor(testSize * 1.5); // Expand more
            } else {
                break; // Found the limit
            }
        }
        max = optimalSize * 2; // Set max above current optimal
    }
    
    // Now binary search within the range to find exact maximum
    while (max - min > 1) {
        const mid = Math.floor((min + max) / 2);
        tempSpan.style.fontSize = mid + 'px';
        const textWidth = tempSpan.offsetWidth;
        
        if (textWidth <= containerWidth) {
            optimalSize = mid;
            min = mid; // Try larger
        } else {
            max = mid; // Too large, try smaller
        }
    }
    
    // Clean up
    document.body.removeChild(tempSpan);
    
    // Apply the optimal font-size
    element.style.fontSize = optimalSize + 'px';
    
    return optimalSize;
}

// Auto-fit function that runs on resize
function autoFitTextToLine(element, minFontSize = 12) {
    if (!element) return;
    
    // Fit on initial load
    fitTextToLine(element, minFontSize);
    
    // Fit on resize
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            fitTextToLine(element, minFontSize);
        }, 100); // Debounce for performance
    });
    
    resizeObserver.observe(element.parentElement);
    
    // Also listen to window resize
    window.addEventListener('resize', () => {
        // Recalculate poster size on window resize
        const activeSizeOption = document.querySelector('#size .option-item.active');
        if (activeSizeOption) {
            const currentSize = activeSizeOption.getAttribute('data-value');
            updatePosterSize(currentSize);
        }
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            fitTextToLine(element, minFontSize);
        }, 100);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadGoogleFonts();
    
    // Set up tracks list column adjustment
    setupTracksListFontSize();
    
    // Initialize default grey palette on poster
    const defaultGreys = ['#f5f5f5', '#cccccc', '#999999', '#666666', '#333333'];
    updatePosterPaletteSwatches(defaultGreys);
    
    // Auto-fit h1 title to one line
    const titleElement = document.getElementById('title');
    if (titleElement) {
        autoFitTextToLine(titleElement, 20); // Min font-size only, no max
    }
    
    // Apply initial font to poster
    applyFontToPoster(currentFont);
    
    // Disable customize section until CREATE is clicked
    const customizeSection = document.getElementById('customize');
    if (customizeSection) {
        customizeSection.classList.add('disabled');
    }
    
    // Check if editing a poster from gallery
    const editPosterData = sessionStorage.getItem('editPosterData');
    if (editPosterData) {
        try {
            const posterData = JSON.parse(editPosterData);
            loadPosterForEditing(posterData);
            // Clear the sessionStorage after loading
            sessionStorage.removeItem('editPosterData');
        } catch (error) {
            console.error('Error loading poster for editing:', error);
        }
    }
});

// Load poster data for editing
function loadPosterForEditing(posterData) {
    // Populate form fields
    const albumNameInput = document.getElementById('album-name');
    const artistNameInput = document.getElementById('artist-name');
    
    if (albumNameInput && posterData.title) {
        albumNameInput.value = posterData.title;
        currentTitle = posterData.title;
    }
    
    if (artistNameInput && posterData.artist) {
        artistNameInput.value = posterData.artist;
        currentArtist = posterData.artist;
    }
    
    // Load album data
    if (posterData.albumData) {
        currentAlbumData = {
            tracks: posterData.albumData.tracks || [],
            releaseDate: posterData.albumData.releaseDate || '',
            runtime: posterData.albumData.runtime || '',
            description: posterData.albumData.description || ''
        };
    }
    
    // Load palette
    if (posterData.palette && posterData.palette.length > 0) {
        currentPalette = posterData.palette;
        updatePosterPaletteSwatches(posterData.palette);
    }
    
    // Load font
    if (posterData.font) {
        currentFont = posterData.font;
        const fontSelectBtn = document.getElementById('font-select-btn');
        if (fontSelectBtn) {
            fontSelectBtn.textContent = posterData.font;
        }
        applyFontToPoster(posterData.font);
    }
    
    // Load size and orientation
    const posterCanvas = document.getElementById('poster-preview');
    if (posterCanvas) {
        if (posterData.size) {
            posterCanvas.setAttribute('data-size', posterData.size);
            // Update size selector UI
            const sizeItems = document.querySelectorAll('#size .option-item');
            sizeItems.forEach(item => {
                if (item.getAttribute('data-value') === posterData.size) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        if (posterData.orientation) {
            posterCanvas.setAttribute('data-orientation', posterData.orientation);
            // Update orientation selector UI
            const orientationItems = document.querySelectorAll('#orientation .option-item');
            orientationItems.forEach(item => {
                if (item.getAttribute('data-value') === posterData.orientation) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }
    
    // Load text type
    if (posterData.textType) {
        currentTextType = posterData.textType;
        // Update text option buttons
        const textOptionBtns = document.querySelectorAll('.text-option-btn');
        textOptionBtns.forEach(btn => {
            if (btn.getAttribute('data-type') === posterData.textType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // Load lyrics if available
    if (posterData.lyrics && posterData.textType === 'lyrics') {
        selectedLyricsLines = posterData.lyrics;
    }
    
    // Load album image if available (use albumImageUrl if it exists, NOT the poster image)
    if (posterData.albumImageUrl) {
        pendingImageSource = posterData.albumImageUrl;
        // Update image input field to show the album image URL
        const imageInput = document.getElementById('image-input');
        if (imageInput) {
            imageInput.value = posterData.albumImageUrl;
        }
        // Display the album image in the poster preview
        updateAlbumArt(posterData.albumImageUrl);
        // Process the image to extract color palette (if not already loaded)
        if (!posterData.palette || posterData.palette.length === 0) {
            processImage(posterData.albumImageUrl);
        }
    } else if (posterData.imageData) {
        // Fallback to poster image if album image URL not available (for backwards compatibility)
        // But this should not happen for new posters - they should have albumImageUrl
        console.warn('No albumImageUrl found, falling back to poster image (backwards compatibility)');
        pendingImageSource = posterData.imageData;
        const imageInput = document.getElementById('image-input');
        if (imageInput) {
            imageInput.value = '';
        }
        updateAlbumArt(posterData.imageData);
    }
    
    // Update poster content
    updatePosterContent();
    
    // Enable customize section since we're editing
    const customizeSection = document.getElementById('customize');
    if (customizeSection) {
        customizeSection.classList.remove('disabled');
    }
    
    showNotification('Poster loaded for editing');
}

// Update poster size and maximize width
function updatePosterSize(size) {
    const posterCanvas = document.getElementById('poster-preview');
    if (!posterCanvas) return;
    
    // Update data-size attribute
    posterCanvas.setAttribute('data-size', size);
    
    // Get current orientation
    const orientation = posterCanvas.getAttribute('data-orientation') || 'vertical';
    
    // Calculate aspect ratio based on size and orientation
    let aspectRatio;
    if (size === 'paper') {
        aspectRatio = orientation === 'horizontal' ? 11 / 8.5 : 8.5 / 11;
    } else if (size === 'tabloid') {
        aspectRatio = orientation === 'horizontal' ? 17 / 11 : 11 / 17;
    } else {
        // Default to tabloid
        aspectRatio = orientation === 'horizontal' ? 17 / 11 : 11 / 17;
    }
    
    // Maximize width based on available space
    // The poster should take up maximum width without intruding into other elements
    // The #preview container uses flex: 1, so we calculate based on available space
    const previewContainer = document.getElementById('preview');
    if (previewContainer) {
        const containerHeight = previewContainer.clientHeight;
        const containerWidth = previewContainer.clientWidth;
        
        // Only update if container has valid dimensions
        if (containerHeight > 0 && containerWidth > 0) {
            // Calculate optimal width
            // Try width-first: maximize width, then check if height fits
            let optimalWidth = containerWidth;
            let optimalHeight = optimalWidth / aspectRatio;
            
            // If height exceeds container, scale down based on height
            if (optimalHeight > containerHeight) {
                optimalHeight = containerHeight;
                optimalWidth = optimalHeight * aspectRatio;
            }
            
            // Set width and let CSS aspect-ratio handle the height
            // This ensures the aspect ratio is maintained via CSS
            posterCanvas.style.width = `${optimalWidth}px`;
            posterCanvas.style.height = 'auto'; // Let aspect-ratio CSS handle this
            posterCanvas.style.maxWidth = '100%';
            posterCanvas.style.maxHeight = '100%';
        }
    }
}

// Update poster layout based on selected layout option
function updatePosterLayout(layout) {
    const posterContent = document.getElementById('poster-content');
    if (!posterContent) return;
    
    // Set data-layout attribute which CSS uses to apply flexbox order
    posterContent.setAttribute('data-layout', layout);
}

// Event Listeners
function initializeEventListeners() {
    // Unified image input (handles both URL and file upload)
    const imageInput = document.getElementById('image-input');
    const fileInput = document.getElementById('image-file-input');
    const uploadBtn = document.getElementById('image-upload-btn');
    
    // Upload button - opens file picker
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // File input - handles file selection (no auto-generation)
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleImageFileUpload(e);
            // Update the text input to show file name
            if (e.target.files.length > 0 && imageInput) {
                imageInput.value = e.target.files[0].name;
            }
            // Don't auto-generate - wait for CREATE button
        });
    }
    
    // Text input - handles URL pasting/typing (no auto-generation)
    if (imageInput) {
        imageInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            // If it looks like a URL, process it (but don't generate poster)
            if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image'))) {
                handleImageUrl({ target: { value: value } });
            }
        });
        
        imageInput.addEventListener('paste', (e) => {
            // Handle paste event with a slight delay to ensure value is set
            setTimeout(() => {
                const value = e.target.value.trim();
                if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image'))) {
                    handleImageUrl({ target: { value: value } });
                }
            }, 100);
        });
        
        imageInput.addEventListener('change', (e) => {
            const value = e.target.value.trim();
            if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image'))) {
                handleImageUrl({ target: { value: value } });
            }
        });
    }
    
    // CREATE button - triggers poster generation
    const createPosterBtn = document.getElementById('create-poster-btn');
    if (createPosterBtn) {
        createPosterBtn.addEventListener('click', async () => {
            await checkAndGeneratePoster();
        });
    }
    
    // Save/Export buttons
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => savePosterToGallery());
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportPoster());
    }
    
    // Size selection handlers
    const sizeOptions = document.querySelectorAll('#size .option-item');
    sizeOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all size options
            sizeOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            option.classList.add('active');
            // Get the size value
            const sizeValue = option.getAttribute('data-value');
            // Update poster preview
            updatePosterSize(sizeValue);
        });
    });
    
    // Orientation selection handlers
    const orientationOptions = document.querySelectorAll('#orientation .option-item');
    orientationOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all orientation options
            orientationOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            option.classList.add('active');
            // Get the orientation value
            const orientationValue = option.getAttribute('data-value');
            // Update poster canvas
            const posterCanvas = document.getElementById('poster-preview');
            if (posterCanvas) {
                posterCanvas.setAttribute('data-orientation', orientationValue);
                // Recalculate size with new orientation
                const activeSizeOption = document.querySelector('#size .option-item.active');
                if (activeSizeOption) {
                    const currentSize = activeSizeOption.getAttribute('data-value');
                    updatePosterSize(currentSize);
                }
            }
        });
    });
    
    // Layout option handlers
    const layoutOptions = document.querySelectorAll('#layout-options .layout-option-btn');
    layoutOptions.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all layout options
            layoutOptions.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Get the layout value
            const layoutValue = button.getAttribute('data-layout');
            // Update poster layout
            updatePosterLayout(layoutValue);
        });
    });
    
    // Initialize size on page load (with a small delay to ensure container dimensions are available)
    setTimeout(() => {
        const activeSizeOption = document.querySelector('#size .option-item.active');
        if (activeSizeOption) {
            const initialSize = activeSizeOption.getAttribute('data-value');
            updatePosterSize(initialSize);
        } else {
            // Fallback: set default tabloid size
            updatePosterSize('tabloid');
        }
    }, 100);
    
    // Initialize layout to A (standard) on page load
    updatePosterLayout('A');
    
    // Track scale slider handler
    const trackScaleSlider = document.getElementById('track-scale-slider');
    if (trackScaleSlider) {
        // Store the base scale (1.0) for reference
        let baseScale = 1.0;
        
        trackScaleSlider.addEventListener('input', (e) => {
            const scaleMultiplier = parseFloat(e.target.value);
            updateTrackListScale(scaleMultiplier);
        });
        
        // Initialize scale on page load
        updateTrackListScale(1.0);
    }
    
    // Set active navigation link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPage = link.getAttribute('href');
        if ((currentPage === 'index.html' && linkPage === 'index.html') ||
            (currentPage === 'gallery.html' && linkPage === 'gallery.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Listen for accent color input changes
    const accentColorInput = document.getElementById('color-accent');
    if (accentColorInput) {
        accentColorInput.addEventListener('input', (e) => {
            // When user manually changes accent color, update the divider immediately
            const divider = document.getElementById('poster-divider');
            if (divider && e.target.value) {
                divider.style.background = e.target.value;
            }
        });
    }
    
    // Smooth scrolling for navigation (only for hash links)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Text option buttons (Album Description, Lyric Excerpt, None)
    const textOptionButtons = document.querySelectorAll('.text-option-btn');
    textOptionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            textOptionButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current text type
            currentTextType = this.getAttribute('data-type') || 'none';
            
            // Show/hide song selection UI based on text type
            const songSelectionUI = document.getElementById('song-selection-ui');
            const lyricsDisplayContainer = document.getElementById('lyrics-display-container');
            
            if (currentTextType === 'lyrics') {
                songSelectionUI.style.display = 'block';
                // Populate dropdown if we have tracks
                if (currentAlbumData.tracks && currentAlbumData.tracks.length > 0) {
                    populateSongDropdown();
                }
            } else {
                songSelectionUI.style.display = 'none';
                lyricsDisplayContainer.style.display = 'none';
                selectedLyricsLines = [];
                currentSelectedSong = '';
            }
            
            // Update poster content
            updateTextContent();
        });
    });
    
    // Song selection button
    const selectSongBtn = document.getElementById('select-song-btn');
    const songDropdown = document.getElementById('song-dropdown');
    
    if (selectSongBtn) {
        selectSongBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = songDropdown.style.display === 'block';
            songDropdown.style.display = isVisible ? 'none' : 'block';
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (songDropdown && !songDropdown.contains(e.target) && !selectSongBtn.contains(e.target)) {
            songDropdown.style.display = 'none';
        }
        
        // Close font dropdown when clicking outside
        const fontDropdown = document.getElementById('font-dropdown');
        const fontSelectBtn = document.getElementById('font-select-btn');
        if (fontDropdown && !fontDropdown.contains(e.target) && fontSelectBtn && !fontSelectBtn.contains(e.target)) {
            fontDropdown.style.display = 'none';
        }
    });
    
    // Font select button
    const fontSelectBtn = document.getElementById('font-select-btn');
    const fontDropdown = document.getElementById('font-dropdown');
    
    if (fontSelectBtn) {
        // Update button text to show current font
        fontSelectBtn.textContent = currentFont;
        
        fontSelectBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = fontDropdown.style.display === 'block';
            fontDropdown.style.display = isVisible ? 'none' : 'block';
            
            // Load fonts if dropdown is empty
            if (fontDropdown.children.length === 0) {
                loadFontOptions();
            }
        });
    }
}

// Load Google Fonts
function loadGoogleFonts() {
    const fonts = ['Roboto:wght@300;400;700', 'Playfair+Display:wght@400;700', 'Montserrat:wght@400;700', 'Oswald:wght@400;700'];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f}`).join('&')}&display=swap`;
    document.head.appendChild(link);
}

// Load font options for the dropdown (5 fonts from Google Fonts)
async function loadFontOptions() {
    const fontDropdown = document.getElementById('font-dropdown');
    if (!fontDropdown) return;
    
    // Define 5 fonts to show
    const fonts = [
        { name: 'Roboto', family: 'Roboto:wght@400;700' },
        { name: 'Playfair Display', family: 'Playfair+Display:wght@400;700' },
        { name: 'Montserrat', family: 'Montserrat:wght@400;700' },
        { name: 'Oswald', family: 'Oswald:wght@400;700' },
        { name: 'Inter', family: 'Inter:wght@400;700' }
    ];
    
    // Load all fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f.family}`).join('&')}&display=swap`;
    document.head.appendChild(fontLink);
    
    // Populate dropdown
    fontDropdown.innerHTML = '';
    
    fonts.forEach(font => {
        const item = document.createElement('div');
        item.className = 'font-dropdown-item';
        if (font.name === currentFont) {
            item.classList.add('selected');
        }
        item.textContent = font.name;
        item.style.fontFamily = `'${font.name}', sans-serif`;
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            selectFont(font.name);
            // Update selected state
            fontDropdown.querySelectorAll('.font-dropdown-item').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
        });
        fontDropdown.appendChild(item);
    });
}

// Select a font and apply it to all poster text
function selectFont(fontName) {
    currentFont = fontName;
    
    // Update button text
    const fontSelectBtn = document.getElementById('font-select-btn');
    if (fontSelectBtn) {
        fontSelectBtn.textContent = fontName;
    }
    
    // Apply font to all poster text elements
    applyFontToPoster(fontName);
    
    // Close dropdown after selection
    const fontDropdown = document.getElementById('font-dropdown');
    if (fontDropdown) {
        fontDropdown.style.display = 'none';
    }
}

// Apply font to all text elements on the poster
function applyFontToPoster(fontName) {
    // Apply to main content container
    const content = document.getElementById('poster-content');
    if (content) {
        content.style.fontFamily = `'${fontName}', sans-serif`;
    }
    
    // Apply to specific text elements (excluding title)
    const textElements = [
        document.getElementById('poster-album-name'),
        document.getElementById('poster-artist-name'),
        document.getElementById('tracks-list-items'),
        document.getElementById('poster-release-date'),
        document.getElementById('poster-duration'),
        document.getElementById('poster-text-content')
    ];
    
    textElements.forEach(el => {
        if (el) {
            el.style.fontFamily = `'${fontName}', sans-serif`;
        }
    });
    
    // Apply to all list items
    const tracksList = document.getElementById('tracks-list-items');
    if (tracksList) {
        const trackItems = tracksList.querySelectorAll('li');
        trackItems.forEach(li => {
            li.style.fontFamily = `'${fontName}', sans-serif`;
        });
    }
    
    // Apply to metadata labels and values
    const metadataLabels = document.querySelectorAll('.metadata-label');
    const metadataValues = document.querySelectorAll('.metadata-value');
    [...metadataLabels, ...metadataValues].forEach(el => {
        el.style.fontFamily = `'${fontName}', sans-serif`;
    });
    
    // Apply to text content paragraphs
    const textContent = document.getElementById('poster-text-content');
    if (textContent) {
        const paragraphs = textContent.querySelectorAll('p, div');
        paragraphs.forEach(p => {
            p.style.fontFamily = `'${fontName}', sans-serif`;
        });
    }
    
    // Apply to all poster-content class elements
    const posterContentElements = document.querySelectorAll('.poster-content');
    posterContentElements.forEach(el => {
        el.style.fontFamily = `'${fontName}', sans-serif`;
    });
}

// Fetch Song Data (Lyrics)
async function fetchSongData() {
    const artistInput = document.getElementById('artist-input');
    const titleInput = document.getElementById('title-input');
    const artist = artistInput.value.trim();
    const track = titleInput.value.trim();
    const lyricsDisplay = document.getElementById('lyrics-display');
    const fetchBtn = document.getElementById('fetch-data-btn');
    
    if (!artist || !track) {
        lyricsDisplay.innerHTML = '<p style="color: red;">Please enter both artist and title.</p>';
        return;
    }
    
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Loading...';
    lyricsDisplay.innerHTML = '<p>Loading lyrics...</p>';
    
    try {
        // Try direct get first
        const getUrl = CORS_PROXY + encodeURIComponent(`https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`);
        let response = await fetch(getUrl);
        
        if (!response.ok) {
            // Fallback to search
            const searchUrl = CORS_PROXY + encodeURIComponent(`https://lrclib.net/api/search?q=${encodeURIComponent(artist + ' ' + track)}`);
            response = await fetch(searchUrl);
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const searchData = await response.json();
            if (!Array.isArray(searchData) || searchData.length === 0) {
                throw new Error('No results found');
            }
            
            // Find best match
            const bestMatch = findBestMatch(searchData, track, artist);
            const matchGetUrl = CORS_PROXY + encodeURIComponent(`https://lrclib.net/api/get?track_name=${encodeURIComponent(bestMatch.trackName || bestMatch.name)}&artist_name=${encodeURIComponent(bestMatch.artistName || bestMatch.artist)}`);
            response = await fetch(matchGetUrl);
            
            if (!response.ok) throw new Error('Failed to fetch lyrics');
        }
        
        const lyricsData = await response.json();
        currentLyrics = lyricsData.plainLyrics || 
                       (lyricsData.syncedLyrics && Array.isArray(lyricsData.syncedLyrics) ? 
                         lyricsData.syncedLyrics.map(line => line.text || line).join('\n') : 
                         lyricsData.syncedLyrics) ||
                       lyricsData.lyrics || '';
        
        currentArtist = lyricsData.artistName || artist;
        currentTitle = lyricsData.trackName || lyricsData.name || track;
        
        lyricsDisplay.innerHTML = `<pre>${currentLyrics || 'No lyrics available'}</pre>`;
        updatePosterPreview();
        
    } catch (error) {
        lyricsDisplay.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        console.error('Error fetching lyrics:', error);
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Load Song Data';
    }
}

function findBestMatch(results, track, artist) {
    const trackLower = track.toLowerCase();
    const artistLower = artist.toLowerCase();
    let bestMatch = results[0];
    let bestScore = 0;
    
    for (const result of results) {
        const resultTrack = (result.trackName || result.name || '').toLowerCase();
        const resultArtist = (result.artistName || result.artist || '').toLowerCase();
        
        let score = 0;
        if (resultTrack === trackLower && resultArtist === artistLower) {
            score = 100;
        } else if (resultTrack === trackLower) {
            score = 50;
        } else if (resultTrack.includes(trackLower) && resultArtist === artistLower) {
            score = 30;
        } else if (resultArtist === artistLower) {
            score = 10;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = result;
        }
    }
    
    return bestMatch;
}

// Handle Image File Upload
function handleImageFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        processImage(event.target.result);
    };
    reader.onerror = function() {
        alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
}

// Handle Image URL
async function handleImageUrl(e) {
    const url = e.target.value.trim();
    if (!url) return;
    
    // Validate URL format
    try {
        new URL(url);
    } catch {
        // Not a valid URL, might be a relative path or invalid
        return;
    }
    
    // Check if it's an image URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const isImageUrl = imageExtensions.some(ext => url.toLowerCase().includes(ext)) || 
                       url.includes('imgur.com') || 
                       url.includes('unsplash.com') ||
                       url.includes('pexels.com');
    
    if (!isImageUrl && !url.startsWith('data:image')) {
        // Still try to load it, might be an API endpoint that returns an image
    }
    
    // Process the image URL
    processImage(url);
}

// Process Image (works for both file data URLs and image URLs)
function processImage(imageSource) {
    const img = new Image();
    
    // Determine the actual image URL to use
    let imageUrl;
    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        // For external images, use server proxy to avoid CORS issues
        const apiBaseUrl = getApiBaseUrl();
        imageUrl = `${apiBaseUrl}/api/image-proxy?url=${encodeURIComponent(imageSource)}`;
        img.crossOrigin = 'anonymous';
    } else {
        // For data URLs or local files, use directly
        imageUrl = imageSource;
    }
    
    img.onload = function() {
        try {
            // Store image source but don't display until CREATE button is clicked
            pendingImageSource = imageSource;
            
            // Extract color palette but don't display until CREATE button is clicked
            const palette = extractColorPalette(img, 5);
            currentPalette = palette;
            // Don't call displayColorPalette here - wait for CREATE button
            
            // Don't auto-generate - wait for CREATE button
            // Don't update album art yet - wait for CREATE button
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. Please try a different image.');
        }
    };
    
    img.onerror = function() {
        console.error('Failed to load image:', imageSource);
        alert('Failed to load image. Please try a different image URL or upload a file.');
            };
    
    // Set the image source (only once!)
    img.src = imageUrl;
}

// Check if all required inputs are valid and generate poster
async function checkAndGeneratePoster() {
    const albumName = document.getElementById('album-name')?.value.trim();
    const artistName = document.getElementById('artist-name')?.value.trim();
    const fileInput = document.getElementById('image-file-input');
    const imageInput = document.getElementById('image-input');
    const createBtn = document.getElementById('create-poster-btn');
    
    // Check if image is provided (either file or URL in the unified input)
    const hasImage = (fileInput?.files.length > 0) || (imageInput?.value.trim() !== '');
    
    // Validate inputs
    if (!albumName) {
        alert('Please enter an album name');
        return;
    }
    
    if (!artistName) {
        alert('Please enter an artist name');
        return;
    }
    
    if (!hasImage) {
        alert('Please upload or paste an image URL');
        return;
    }
    
    // Disable button during generation
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = 'CREATING...';
    }
    
    try {
        await generatePoster(albumName, artistName);
        
        // Enable customize section after poster is generated
        const customizeSection = document.getElementById('customize');
        if (customizeSection) {
            customizeSection.classList.remove('disabled');
        }
    } catch (error) {
        console.error('Error generating poster:', error);
        alert('Error generating poster. Please try again.');
        // Still update poster with basic info even if Discogs API fails
        currentArtist = artistName;
        currentTitle = albumName;
        updatePosterContent();
        
        // Display the image even if there's an error
        if (pendingImageSource) {
            updateAlbumArt(pendingImageSource);
        }
        
        // Enable customize section even if there's an error
        const customizeSection = document.getElementById('customize');
        if (customizeSection) {
            customizeSection.classList.remove('disabled');
        }
    } finally {
        // Re-enable button
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.textContent = 'CREATE';
        }
    }
}

// Generate the poster with provided information
async function generatePoster(albumName, artistName) {
    // Update current artist and title
    currentArtist = artistName;
    currentTitle = albumName;
    
    // Reset accent color initialization flag so it gets set from palette for new poster
    accentColorInitialized = false;
    
    // Fetch album information from Discogs API first
    await fetchAlbumInfoFromDiscogs(albumName, artistName);
    
    // Update preview with new structure (includes tracks, metadata, etc.)
    updatePosterContent();
    
    // Display the image on the poster after all other information is generated
    if (pendingImageSource) {
        updateAlbumArt(pendingImageSource);
    }
    
    console.log('Poster generated for:', albumName, 'by', artistName);
}

// Fetch album information from Discogs API
async function fetchAlbumInfoFromDiscogs(albumName, artistName) {
    try {
        console.log('Fetching album info from Discogs for:', albumName, 'by', artistName);
        
        // Check cache first to prevent sporadic changes
        const cacheKey = `${albumName.toLowerCase()}_${artistName.toLowerCase()}`;
        if (albumDataCache.has(cacheKey)) {
            console.log('Using cached album data for:', cacheKey);
            currentAlbumData = albumDataCache.get(cacheKey);
            updatePosterContent();
            return;
        }
        
        // Use server proxy to avoid CORS issues with Discogs API
        // Step 1: Search for the album
        const searchQuery = encodeURIComponent(artistName + ' ' + albumName);
        const apiBaseUrl = getApiBaseUrl();
        const searchUrl = `${apiBaseUrl}/api/discogs/search?q=${searchQuery}&type=release&format=album`;
        console.log('Searching Discogs via proxy:', searchUrl);
        
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
            let errorData;
            try {
                errorData = await searchResponse.json();
            } catch (e) {
                errorData = { message: `Discogs search failed: ${searchResponse.status}` };
            }
            
            const errorMessage = errorData.message || `Discogs search failed: ${searchResponse.status}`;
            
            // Provide more specific error messages
            if (searchResponse.status === 401) {
                throw new Error('Discogs API authentication failed. Please check your server configuration.');
            } else if (searchResponse.status === 429) {
                throw new Error('Discogs API rate limit exceeded. Please wait a moment and try again.');
            } else if (searchResponse.status >= 500) {
                throw new Error('Discogs API is experiencing issues. Please try again later.');
            }
            
            throw new Error(errorMessage);
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.results || searchData.results.length === 0) {
            throw new Error('No album found on Discogs');
        }
        
        // Find the best match (exact or closest match)
        let bestMatch = searchData.results[0];
        const albumLower = albumName.toLowerCase();
        const artistLower = artistName.toLowerCase();
        
        for (const result of searchData.results) {
            const titleLower = (result.title || '').toLowerCase();
            const artistMatch = result.artist && result.artist.toLowerCase().includes(artistLower);
            const titleMatch = titleLower.includes(albumLower) || albumLower.includes(titleLower.split(' - ')[0]);
            
            if (artistMatch && titleMatch) {
                bestMatch = result;
                break;
            }
        }
        
        console.log('Best match found:', bestMatch.title, 'by', bestMatch.artist);
        
        // Step 2: Get detailed release information
        const releaseId = bestMatch.id;
        const releaseUrl = `${apiBaseUrl}/api/discogs/release/${releaseId}`;
        
        const releaseResponse = await fetch(releaseUrl);
        
        if (!releaseResponse.ok) {
            throw new Error(`Discogs release fetch failed: ${releaseResponse.status}`);
        }
        
        const releaseData = await releaseResponse.json();
        
        // Extract track list (in correct order)
        const tracks = [];
        if (releaseData.tracklist && Array.isArray(releaseData.tracklist)) {
            releaseData.tracklist.forEach(track => {
                // Only include actual tracks (not index tracks or sub-tracks)
                if (track.type_ === 'track' || !track.type_) {
                    const trackName = track.title || track.position || 'Unknown Track';
                    tracks.push(trackName);
                }
            });
        }
        
        // Get release date from GPT instead of Discogs
        let releaseDate = 'Release Date';
        try {
            console.log('Fetching release date from GPT for:', albumName, 'by', artistName);
            const releaseDatePrompt = `What is the exact release date of the album "${albumName}" by "${artistName}"? 

Return ONLY the release date in the format "Month Day, Year" (e.g., "November 22, 2010") or "Month, Year" (e.g., "November, 2010") if the day is unknown, or just "Year" (e.g., "2010") if only the year is known. 

Do not include any other text, explanations, or formatting. Just return the date in the specified format.`;
            
            const gptReleaseDate = await generateTextWithOpenAI(releaseDatePrompt, {
                reasoning: { effort: "low" },
                text: { verbosity: "low" }
            });
            
            releaseDate = gptReleaseDate.trim();
            console.log('Release date from GPT:', releaseDate);
        } catch (error) {
            console.error('Error fetching release date from GPT:', error);
            // Fallback to Discogs date if GPT fails
            if (releaseData.released) {
            const dateStr = releaseData.released;
            console.log('Raw date string from Discogs:', dateStr);
            
            // Discogs date format can be YYYY-MM-DD, YYYY-MM, or just YYYY
            // Handle cases like "2010-11-00" where day is invalid
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parts[2] ? parseInt(parts[2], 10) : null;
                
                console.log('Parsed date parts - Year:', year, 'Month:', month, 'Day:', day);
                
                // Validate date parts
                if (year && year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
                    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
                    
                    // Check if day is valid (not null, not 0, within valid range, and creates a valid date)
                    if (day && day !== 0 && day >= 1 && day <= 31) {
                        // Try to create a date object to validate the day is actually valid for that month
                        const testDate = new Date(year, month - 1, day);
                        console.log('Test date object:', testDate, 'Is valid:', !isNaN(testDate.getTime()));
                        console.log('Date validation - getDate():', testDate.getDate(), 'Expected day:', day, 'getMonth():', testDate.getMonth(), 'Expected month-1:', month - 1);
                        
                        if (!isNaN(testDate.getTime()) && testDate.getDate() === day && testDate.getMonth() === month - 1) {
                            // Day is valid, include it in format: "Month xx, xxxx"
                            releaseDate = `${monthName} ${day}, ${year}`;
                            console.log('Day is valid - Final formatted date:', releaseDate);
                        } else {
                            // Day is invalid for this month (e.g., Feb 30), omit it
                            releaseDate = `${monthName}, ${year}`;
                            console.log('Day is invalid for this month - Final formatted date:', releaseDate);
                        }
                    } else {
                        // Day is invalid (null, 0, or out of range), omit it
                        releaseDate = `${monthName}, ${year}`;
                        console.log('Day is invalid (null/0/out of range) - Final formatted date:', releaseDate);
                    }
                } else {
                    // Invalid date format, try to parse as-is
                    console.log('Date parts validation failed, trying to parse as-is');
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                        const dayNum = date.getDate();
                        const yearNum = date.getFullYear();
                        releaseDate = `${monthName} ${dayNum}, ${yearNum}`;
                        console.log('Parsed as-is - Final formatted date:', releaseDate);
                    } else {
                        releaseDate = dateStr;
                        console.log('Could not parse date - Using raw string:', releaseDate);
                    }
                }
            } else if (dateStr.length === 4 && /^\d{4}$/.test(dateStr)) {
                // Just year - no day available, format as "YYYY"
                const year = parseInt(dateStr, 10);
                if (year >= 1900 && year <= 2100) {
                    releaseDate = `${year}`;
                    console.log('Year only - Final formatted date:', releaseDate);
                } else {
                    releaseDate = dateStr;
                    console.log('Year out of range - Using raw string:', releaseDate);
                }
            } else {
                releaseDate = dateStr;
                console.log('Date string format not recognized - Using raw string:', releaseDate);
            }
        } else if (releaseData.year) {
            const year = releaseData.year.toString();
            console.log('Using releaseData.year:', year);
            if (/^\d{4}$/.test(year)) {
                const yearNum = parseInt(year, 10);
                if (yearNum >= 1900 && yearNum <= 2100) {
                    // No day available, format as "YYYY"
                    releaseDate = `${yearNum}`;
                    console.log('Year from releaseData.year - Final formatted date:', releaseDate);
                } else {
                    releaseDate = year;
                    console.log('Year from releaseData.year out of range - Using raw:', releaseDate);
                }
            } else {
                releaseDate = year;
                console.log('Year from releaseData.year invalid format - Using raw:', releaseDate);
            }
            } else {
                releaseDate = 'Release Date';
            }
        }
        
        console.log('Final release date value:', releaseDate);
        
        // Calculate runtime from track durations
        let totalSeconds = 0;
        if (releaseData.tracklist && Array.isArray(releaseData.tracklist)) {
            releaseData.tracklist.forEach(track => {
                if (track.duration) {
                    const duration = track.duration.split(':');
                    if (duration.length === 2) {
                        totalSeconds += parseInt(duration[0]) * 60 + parseInt(duration[1]);
                    } else if (duration.length === 3) {
                        totalSeconds += parseInt(duration[0]) * 3600 + parseInt(duration[1]) * 60 + parseInt(duration[2]);
                    }
                }
            });
        }
        
        // Format runtime as "MM:SS" (minutes:seconds)
        const runtime = totalSeconds > 0 
            ? `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
            : 'Duration';
        
        // Generate comprehensive description using GPT
        let description = '';
        try {
            console.log('Generating album description with GPT...');
            const descriptionPrompt = `You are a music critic writing a concise, eloquent album review. Write a description of "${albumName}" by ${artistName} (released ${releaseDate}) in exactly 50 words or fewer.

The description must seamlessly incorporate all of the following elements:
(a) The album's sound, feel, lyrical content, and/or themes
(b) The context of the album's release - what was happening in music/the world when this was released, and how it fit into ${artistName}'s career trajectory
(c) The album's impact - how it was received, its influence on music, and its lasting legacy

IMPORTANT: 
- Do NOT include the album name ("${albumName}") or release date (${releaseDate}) or runtime/length, as these are already displayed elsewhere
- Write naturally and elegantly - do not explicitly label the components (a), (b), (c)
- Write in the persona of a knowledgeable, articulate music critic
- Keep it concise and eloquent - maximum 50 words total`;

            const gptDescription = await generateTextWithOpenAI(descriptionPrompt, {
                reasoning: { effort: "high" },
                text: { verbosity: "low" } // Low verbosity for concise, eloquent 50-word descriptions
            });
            
            description = gptDescription.trim();
            console.log('GPT description generated successfully');
        } catch (error) {
            console.error('Error generating description with GPT:', error);
            // Fallback to simple description if GPT fails
            if (releaseData.genres && releaseData.genres.length > 0) {
                description = `A ${releaseData.genres[0]} album`;
                if (releaseData.styles && releaseData.styles.length > 0) {
                    description += ` with ${releaseData.styles[0]} influences`;
                }
                description += '.';
            } else {
                description = `An album by ${artistName}.`;
            }
        }
        
        // Validate tracks
        if (tracks.length === 0) {
            throw new Error('No tracks found in Discogs release');
        }
        
        // Update current album data
        currentAlbumData = {
            tracks: tracks,
            releaseDate: releaseDate,
            runtime: runtime,
            description: description
        };

        console.log(`Album info fetched successfully: ${tracks.length} tracks found`);
        console.log('Tracks:', tracks);
        console.log('Release Date:', releaseDate);
        console.log('Runtime:', runtime);
        
        // Cache the result
        albumDataCache.set(cacheKey, currentAlbumData);
        console.log('Album data cached for future use');
        
        // Update poster content after fetching data
        updatePosterContent();
    } catch (error) {
        console.error('Error fetching album info from Discogs:', error);
        console.error('Error details:', error.message);
        
        // Show user-friendly error notification
        const errorMsg = error.message || 'Failed to fetch album information from Discogs';
        showNotification(`Error: ${errorMsg}. Using placeholder data.`, 'error');
        
        // Use default/placeholder data if API fails
        currentAlbumData = {
            tracks: ['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5', 'Track 6', 'Track 7', 'Track 8', 'Track 9'],
            releaseDate: 'Release Date',
            runtime: 'Duration',
            description: ''
        };
        // Still update poster with defaults
        updatePosterContent();
    }
}

// Fetch album information from GPT API (fallback when Discogs fails)
async function fetchAlbumInfoFromGPT(albumName, artistName) {
    try {
        console.log('Fetching album info from GPT for:', albumName, 'by', artistName);
        
        // Check cache first
        const cacheKey = `${albumName.toLowerCase()}_${artistName.toLowerCase()}`;
        if (albumDataCache.has(cacheKey)) {
            console.log('Using cached album data for:', cacheKey);
            currentAlbumData = albumDataCache.get(cacheKey);
            updatePosterContent();
            return;
        }
        
        // Create prompt for GPT
        const prompt = `You are a music database expert. Provide accurate, complete information about the album "${albumName}" by "${artistName}".

Return a JSON object with the following structure:
{
  "tracks": ["Track 1", "Track 2", ...],  // ALL track names in correct order - use the actual number of tracks for this album
  "releaseDate": "Month Day, Year",  // Format: "May 17, 2013" or just "2013" if only year is known
  "runtime": "MM:SS",  // Total album runtime in minutes:seconds format
  "description": "A comprehensive description that includes: (a) the album's sound and/or feel, (b) the context of the album's release, (c) the album's impact, and (d) a fun fact about the album."
}

IMPORTANT:
- List ALL tracks in the correct order
- Use the exact number of tracks for this specific album
- Ensure track names are accurate and complete
- Return ONLY valid JSON, no markdown formatting or code blocks`;

        console.log('Calling GPT API...');
        const responseText = await generateTextWithOpenAI(prompt, {
            reasoning: { effort: "high" },
            text: { verbosity: "low" }
        });
        
        console.log('GPT response received');
        
        // Parse JSON from response (handle markdown code blocks if present)
        let jsonText = responseText.trim();
        
        // Remove markdown code blocks if present
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        
        // Try to parse JSON
        let albumData;
        try {
            albumData = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON parse error, attempting recovery...', parseError);
            
            // Try to extract JSON from malformed response using regex
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    albumData = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    // Try to fix truncated strings in description
                    let fixedJson = jsonMatch[0];
                    if (fixedJson.includes('"description"') && !fixedJson.match(/"description"\s*:\s*"[^"]*"/)) {
                        // Description might be truncated - try to close it
                        fixedJson = fixedJson.replace(/"description"\s*:\s*"([^"]*)$/, '"description": "$1"');
                        // Close the JSON object
                        if (!fixedJson.trim().endsWith('}')) {
                            fixedJson = fixedJson.trim() + '}';
                        }
                        try {
                            albumData = JSON.parse(fixedJson);
                        } catch (e2) {
                            throw new Error('Could not parse GPT response as JSON');
                        }
                    } else {
                        throw new Error('Could not parse GPT response as JSON');
                    }
                }
            } else {
                throw new Error('No JSON found in GPT response');
            }
        }
        
        // Validate and extract data
        if (!albumData || typeof albumData !== 'object') {
            throw new Error('Invalid album data structure from GPT');
        }
        
        // Ensure tracks is an array
        let tracks = [];
        if (Array.isArray(albumData.tracks)) {
            tracks = albumData.tracks.filter(t => t && typeof t === 'string' && t.trim().length > 0);
        }
        
        if (tracks.length === 0) {
            throw new Error('No valid tracks found in GPT response');
        }
        
        // Extract other fields with defaults
        const releaseDate = albumData.releaseDate || albumData.release_date || 'Release Date';
        const runtime = albumData.runtime || albumData.duration || 'Duration';
        const description = albumData.description || '';
        
        // Update current album data
        currentAlbumData = {
            tracks: tracks,
            releaseDate: releaseDate,
            runtime: runtime,
            description: description
        };
        
        console.log(`Album info fetched from GPT successfully: ${tracks.length} tracks found`);
        console.log('Tracks:', tracks);
        console.log('Release Date:', releaseDate);
        console.log('Runtime:', runtime);
        
        // Cache the result
        albumDataCache.set(cacheKey, currentAlbumData);
        console.log('Album data cached for future use');
        
        // Update poster content after fetching data
        updatePosterContent();
    } catch (error) {
        console.error('Error fetching album info from GPT:', error);
        console.error('Error details:', error.message);
        // Use default/placeholder data if GPT also fails
        currentAlbumData = {
            tracks: ['Track 1', 'Track 2', 'Track 3', 'Track 4', 'Track 5', 'Track 6', 'Track 7', 'Track 8', 'Track 9'],
            releaseDate: 'Release Date',
            runtime: 'Duration',
            description: ''
        };
        // Still update poster with defaults
        updatePosterContent();
    }
}

// Update poster content in the preview
function updatePosterContent() {
    const albumNameEl = document.getElementById('poster-album-name');
    const artistNameEl = document.getElementById('poster-artist-name');
    
    if (albumNameEl) {
        albumNameEl.textContent = currentTitle || 'Album Name';
        // Remove inline font-size to allow CSS clamp() values to take effect
        albumNameEl.style.fontSize = '';
    }
    
    if (artistNameEl) {
        artistNameEl.textContent = currentArtist || 'Artist';
        // Remove inline font-size to allow CSS clamp() values to take effect
        artistNameEl.style.fontSize = '';
    }
    
    // Update background color if available
    const bgColor = document.getElementById('color-background')?.value;
    const bgLayer = document.getElementById('poster-background');
    if (bgLayer && bgColor) {
        bgLayer.style.background = bgColor;
    }
    
    // Update text color - apply to ALL text elements
    const textColor = document.getElementById('color-text')?.value;
    if (textColor) {
        // Apply to main content container (sets base color)
        const content = document.getElementById('poster-content');
        if (content) {
            content.style.color = textColor;
        }
        
        // Apply to specific text elements to ensure they use the color
        const albumName = document.getElementById('poster-album-name');
        const artistName = document.getElementById('poster-artist-name');
        const tracksList = document.getElementById('tracks-list-items');
        const releaseDate = document.getElementById('poster-release-date');
        const recordLabel = document.getElementById('poster-record-label');
        const duration = document.getElementById('poster-duration');
        const textContent = document.getElementById('poster-text-content');
        
        if (albumName) albumName.style.color = textColor;
        if (artistName) artistName.style.color = textColor;
        if (tracksList) {
            tracksList.style.color = textColor;
            // Also apply to all list items
            const trackItems = tracksList.querySelectorAll('li');
            trackItems.forEach(li => {
                li.style.color = textColor;
            });
        }
        if (releaseDate) releaseDate.style.color = textColor;
        if (recordLabel) recordLabel.style.color = textColor;
        if (duration) duration.style.color = textColor;
        if (textContent) {
            textContent.style.color = textColor;
            // Apply to any paragraphs inside
            const paragraphs = textContent.querySelectorAll('p');
            paragraphs.forEach(p => {
                p.style.color = textColor;
            });
        }
        
        // Apply to metadata labels and values - ensure all are updated
        const metadataLabels = document.querySelectorAll('.metadata-label');
        const metadataValues = document.querySelectorAll('.metadata-value');
        metadataLabels.forEach(el => el.style.color = textColor);
        metadataValues.forEach(el => el.style.color = textColor);
        
        // Also ensure all metadata-value elements within poster-content are explicitly updated
        if (content) {
            const contentMetadataValues = content.querySelectorAll('.metadata-value');
            contentMetadataValues.forEach(el => el.style.color = textColor);
        }
        
        // Ensure poster-content class elements are updated (in case there are multiple)
        const posterContentElements = document.querySelectorAll('.poster-content');
        posterContentElements.forEach(el => el.style.color = textColor);
    }
    
    // Update accent color - use palette color on initial generation, then respect user changes
    const divider = document.getElementById('poster-divider');
    const accentColorInput = document.getElementById('color-accent');
    
    if (divider) {
        // Only set from palette on initial generation (when accentColorInitialized is false)
        // After that, always use the input value to respect user changes
        if (!accentColorInitialized && currentPalette && currentPalette.length > 0) {
            // Use the second color from the palette (index 1) as accent color
            // If palette has less than 2 colors, use the first color
            const accentColor = currentPalette.length > 1 ? currentPalette[1] : currentPalette[0];
            divider.style.background = accentColor;
            
            // Update the accent color input to reflect the palette color
            if (accentColorInput) {
                accentColorInput.value = accentColor;
            }
            
            accentColorInitialized = true; // Mark as initialized so we don't override user changes
            console.log('Accent color set from palette:', accentColor);
        } else {
            // Use the input value (either user-changed or previously set)
            const accentColor = accentColorInput?.value;
            if (accentColor) {
                divider.style.background = accentColor;
            }
        }
    }
    
    // Update poster palette swatches if palette exists, otherwise use default greys
    // Only display palette after CREATE button is clicked (when updatePosterContent is called)
    if (currentPalette && currentPalette.length > 0) {
        updatePosterPaletteSwatches(currentPalette);
    } else {
        // Initialize with default grey palette
        const defaultGreys = ['#f5f5f5', '#cccccc', '#999999', '#666666', '#333333'];
        updatePosterPaletteSwatches(defaultGreys);
    }
    
    // Update track list
    updateTrackList();
    
    // Update metadata (release date, runtime)
    updateAlbumMetadata();
    
    // Update text content (description or lyrics)
    updateTextContent();
    
    // Adjust tracks list font-size to fit all tracks in one column
    adjustTracksListFontSize();
}

// Calculate font-size for track list based on number of tracks
function calculateTrackListFontSize(trackCount) {
    // Base font-size is 1em (inherited from bottom-section)
    // For every 5 songs over 10, decrease by 0.05em
    if (trackCount <= 10) {
        return '1em'; // Base size
    }
    
    // Calculate how many groups of 5 songs over 10
    // Use Math.ceil so that 11-15 tracks = 1 group, 16-20 = 2 groups, etc.
    const songsOver10 = trackCount - 10;
    const groupsOf5 = Math.ceil(songsOver10 / 5);
    const reduction = groupsOf5 * 0.05; // 0.05em reduction per group
    
    // Calculate final font-size (ensure it doesn't go below 0.3em minimum)
    const finalSize = Math.max(1 - reduction, 0.3);
    return `${finalSize}em`;
}

// Update track list with generated tracks
function updateTrackList() {
    const tracksList = document.getElementById('tracks-list-items');
    if (!tracksList) return;
    
    // Clear existing tracks
    tracksList.innerHTML = '';
    
        // Add tracks from currentAlbumData - use exact number returned by Discogs
    if (currentAlbumData.tracks && currentAlbumData.tracks.length > 0) {
            // Use the exact number of tracks returned by Discogs
        currentAlbumData.tracks.forEach(track => {
            const li = document.createElement('li');
            li.textContent = track;
            tracksList.appendChild(li);
        });
        console.log(`Updated track list with ${currentAlbumData.tracks.length} tracks`);
        
        // Calculate and apply dynamic font-size based on track count
        const trackCount = currentAlbumData.tracks.length;
        const fontSize = calculateTrackListFontSize(trackCount);
        tracksList.style.fontSize = fontSize;
        console.log(`Track list font-size set to ${fontSize} for ${trackCount} tracks`);
        
        // Adjust font-size after track list is updated
        adjustTracksListFontSize();
        
        // Apply scale from slider if it exists
        const trackScaleSlider = document.getElementById('track-scale-slider');
        if (trackScaleSlider) {
            const scaleMultiplier = parseFloat(trackScaleSlider.value);
            updateTrackListScale(scaleMultiplier);
        }
        
        // If lyrics option is selected, update the dropdown
        if (currentTextType === 'lyrics') {
            populateSongDropdown();
        }
    } else {
        // Default placeholder tracks (only if no data available)
        for (let i = 1; i <= 9; i++) {
            const li = document.createElement('li');
            li.textContent = `Track ${i}`;
            tracksList.appendChild(li);
        }
        // Apply font-size for placeholder tracks (9 tracks = base size)
        const fontSize = calculateTrackListFontSize(9);
        tracksList.style.fontSize = fontSize;
    }
}

// Update album metadata (release date and runtime)
// Note: Labels are now in HTML, we only update the values
function updateAlbumMetadata() {
    const releaseDateEl = document.getElementById('poster-release-date');
    const durationEl = document.getElementById('poster-duration');
    
    // Handle release date
    if (releaseDateEl) {
        const releaseDateItem = releaseDateEl.closest('.metadata-item');
        if (currentAlbumData.releaseDate && 
            currentAlbumData.releaseDate !== 'Release Date' && 
            currentAlbumData.releaseDate.trim() !== '') {
            releaseDateEl.textContent = currentAlbumData.releaseDate;
            if (releaseDateItem) {
                releaseDateItem.style.display = 'block';
            }
        } else {
            // Hide the metadata item if data is not available
            if (releaseDateItem) {
                releaseDateItem.style.display = 'none';
            }
        }
    }
    
    // Handle duration/runtime
    if (durationEl) {
        const durationItem = durationEl.closest('.metadata-item');
        if (currentAlbumData.runtime && 
            currentAlbumData.runtime !== 'Duration' && 
            currentAlbumData.runtime.trim() !== '') {
            durationEl.textContent = currentAlbumData.runtime;
            if (durationItem) {
                durationItem.style.display = 'block';
            }
        } else {
            // Hide the metadata item if data is not available
            if (durationItem) {
                durationItem.style.display = 'none';
            }
        }
    }
}

// Update text content based on selected type
function updateTextContent() {
    const textContentEl = document.getElementById('poster-text-content');
    if (!textContentEl) return;
    
    if (currentTextType === 'description' && currentAlbumData.description) {
        // Show album description
        textContentEl.innerHTML = `<p>${currentAlbumData.description}</p>`;
    } else if (currentTextType === 'lyrics' && selectedLyricsLines.length > 0) {
        // Sort selected lines by index (chronological order)
        const sortedLines = [...selectedLyricsLines].sort((a, b) => a.index - b.index);
        
        // Get the text from sorted lines - add "..." for gaps between non-consecutive lines
        const selectedTextParts = [];
        for (let i = 0; i < sortedLines.length; i++) {
            const line = sortedLines[i];
            const prevLine = i > 0 ? sortedLines[i - 1] : null;
            
            // Check if there's a gap (non-consecutive indices)
            if (prevLine && line.index - prevLine.index > 1) {
                selectedTextParts.push('...');
            }
            
            // Text should already be clean from selection, but ensure it is
            let cleanText = String(line.text || '').trim();
            selectedTextParts.push(cleanText);
        }
        
        const selectedText = selectedTextParts.filter(text => text.length > 0).join(' ');
        
        // Calculate time range (start time of first line to end time of last line)
        let startTime = null;
        let endTime = null;
        
        console.log('Sorted lines for time calculation:', sortedLines);
        
        if (sortedLines.length > 0) {
            // Find the earliest start time
            const startTimes = sortedLines.map(l => {
                let st = l.startTime;
                // Handle string numbers
                if (typeof st === 'string') {
                    st = parseInt(st, 10);
                }
                return st;
            }).filter(t => t !== null && t !== undefined && !isNaN(t) && t > 0);
            
            console.log('Start times found:', startTimes);
            
            if (startTimes.length > 0) {
                startTime = Math.min(...startTimes);
            }
            
            // Find the latest end time
            const endTimes = sortedLines.map(l => {
                let et = l.endTime;
                if (typeof et === 'string') {
                    et = parseInt(et, 10);
                }
                return et;
            }).filter(t => t !== null && t !== undefined && !isNaN(t) && t > 0);
            
            console.log('End times found:', endTimes);
            
            if (endTimes.length > 0) {
                endTime = Math.max(...endTimes);
            }
        }
        
        console.log('Calculated startTime:', startTime, 'endTime:', endTime);
        
        // Format time range - always show if we have any time data
        let timeRange = '';
        if (startTime !== null && !isNaN(startTime) && endTime !== null && !isNaN(endTime)) {
            timeRange = `[${formatTimestamp(startTime)}-${formatTimestamp(endTime)}]`;
            console.log('Time range (both):', timeRange);
        } else if (startTime !== null && !isNaN(startTime)) {
            // If we only have start time
            timeRange = `[${formatTimestamp(startTime)}]`;
            console.log('Time range (start only):', timeRange);
        } else if (sortedLines.length > 0 && sortedLines[0].timestamp) {
            // Fallback to formatted timestamp if available
            timeRange = `[${sortedLines[0].timestamp}]`;
            console.log('Time range (fallback):', timeRange);
        } else {
            console.log('No time range available - no valid timestamps found');
        }
        
        console.log('Final time range:', timeRange);
        
        // Display format: "lyric excerpt" followed by song name, [start time-end time] (no dash)
        const songInfo = timeRange ? `${currentSelectedSong}, ${timeRange}` : currentSelectedSong;
        textContentEl.innerHTML = `<p>"${selectedText}"</p><div style="margin-top: 0.5rem; font-size: 0.75em; font-style: italic; direction: ltr;">${songInfo}</div>`;
    } else if (currentTextType === 'lyrics' && currentLyrics) {
        // Fallback: show lyrics excerpt if no selection
        const lyricsExcerpt = currentLyrics.substring(0, 300) + (currentLyrics.length > 300 ? '...' : '');
        textContentEl.innerHTML = `<p>${lyricsExcerpt.replace(/\n/g, '<br>')}</p>`;
    } else {
        // Show placeholder or nothing
        textContentEl.innerHTML = '<p>Album Description or \'Lyric Excerpt...\' (Track)</p>';
    }
}

// Populate song dropdown with tracks from current album
function populateSongDropdown() {
    const songDropdown = document.getElementById('song-dropdown');
    if (!songDropdown || !currentAlbumData.tracks || currentAlbumData.tracks.length === 0) {
        return;
    }
    
    songDropdown.innerHTML = '';
    
    currentAlbumData.tracks.forEach(track => {
        const item = document.createElement('div');
        item.className = 'song-dropdown-item';
        item.textContent = track;
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            selectSong(track);
            songDropdown.style.display = 'none';
        });
        songDropdown.appendChild(item);
    });
}

// Select a song and fetch its lyrics
async function selectSong(songName) {
    currentSelectedSong = songName;
    const selectSongBtn = document.getElementById('select-song-btn');
    if (selectSongBtn) {
        selectSongBtn.textContent = songName;
    }
    
    // Get artist name from input
    const artistInput = document.getElementById('artist-name');
    const artist = artistInput ? artistInput.value.trim() : '';
    
    if (!artist) {
        showNotification('Please enter an artist name first');
        return;
    }
    
    // Show loading state
    const lyricsDisplayContainer = document.getElementById('lyrics-display-container');
    const lyricsScrollBox = document.getElementById('lyrics-scroll-box');
    if (lyricsDisplayContainer) {
        lyricsDisplayContainer.style.display = 'block';
    }
    if (lyricsScrollBox) {
        lyricsScrollBox.innerHTML = '<p>Loading lyrics...</p>';
    }
    
    // Fetch lyrics from LRCLIB API
    await fetchLyricsFromLRCLIB(artist, songName);
}

// Fetch lyrics from LRCLIB API
async function fetchLyricsFromLRCLIB(artist, track) {
    const CORS_PROXY = 'https://corsproxy.io/?';
    
    try {
        // Try direct get first
        const getUrl = CORS_PROXY + encodeURIComponent(`https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`);
        let response = await fetch(getUrl);
        
        // If direct get fails, try search
        if (!response.ok) {
            const searchUrl = CORS_PROXY + encodeURIComponent(`https://lrclib.net/api/search?q=${encodeURIComponent(artist + ' ' + track)}`);
            const searchResponse = await fetch(searchUrl);
            
            if (!searchResponse.ok) {
                throw new Error(`Search failed: ${searchResponse.status}`);
            }
            
            const searchData = await searchResponse.json();
            
            if (!Array.isArray(searchData) || searchData.length === 0) {
                throw new Error('No search results found');
            }
            
            // Find best match
            const trackLower = track.toLowerCase();
            let bestMatch = searchData[0];
            let bestScore = 0;
            
            for (const result of searchData) {
                const resultTrack = (result.trackName || result.name || '').toLowerCase();
                const resultArtist = (result.artistName || result.artist || '').toLowerCase();
                const artistLower = artist.toLowerCase();
                
                let score = 0;
                if (resultTrack === trackLower && resultArtist === artistLower) {
                    score = 100;
                } else if (resultTrack === trackLower) {
                    score = 50;
                } else if (resultTrack.includes(trackLower) && resultArtist === artistLower) {
                    score = 30;
                } else if (resultArtist === artistLower) {
                    score = 10;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = result;
                }
            }
            
            // Fetch full lyrics for best match
            const matchGetUrl = CORS_PROXY + encodeURIComponent(`https://lrclib.net/api/get?track_name=${encodeURIComponent(bestMatch.trackName || bestMatch.name)}&artist_name=${encodeURIComponent(bestMatch.artistName || bestMatch.artist)}`);
            response = await fetch(matchGetUrl);
            
            if (!response.ok) {
                throw new Error(`Get failed: ${response.status}`);
            }
        }
        
        const lyricsData = await response.json();
        currentLyricsData = lyricsData;
        
        // Store plain lyrics
        currentLyrics = lyricsData.plainLyrics || 
                       (lyricsData.syncedLyrics && Array.isArray(lyricsData.syncedLyrics) ? 
                         lyricsData.syncedLyrics.map(line => line.text || line).join('\n') : 
                         lyricsData.syncedLyrics) ||
                       lyricsData.lyrics || '';
        
        // Display lyrics
        displayLyrics(lyricsData);
        
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        const lyricsScrollBox = document.getElementById('lyrics-scroll-box');
        if (lyricsScrollBox) {
            lyricsScrollBox.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }
}

// Display lyrics in scroll box with hover effects
function displayLyrics(lyricsData) {
    const lyricsScrollBox = document.getElementById('lyrics-scroll-box');
    if (!lyricsScrollBox) return;
    
    // Use synced lyrics if available (has timestamps), otherwise use plain lyrics
    let lyricsLines = [];
    
    if (lyricsData.syncedLyrics && Array.isArray(lyricsData.syncedLyrics)) {
        // Synced lyrics with timestamps
        lyricsLines = lyricsData.syncedLyrics.map((line, idx, arr) => {
            // If endTime is not provided, use next line's startTime, or estimate 3 seconds
            let endTime = line.endTime;
            if (!endTime && idx < arr.length - 1 && arr[idx + 1].startTime) {
                endTime = arr[idx + 1].startTime;
            } else if (!endTime && line.startTime) {
                // Estimate 3 seconds if no end time available
                endTime = line.startTime + 3000;
            }
            
            return {
                text: line.text || line,
                timestamp: line.startTime ? formatTimestamp(line.startTime) : '',
                startTime: line.startTime || null, // Store raw milliseconds
                endTime: endTime || null // Store end time
            };
        });
    } else if (lyricsData.syncedLyrics && typeof lyricsData.syncedLyrics === 'string') {
        // Parse string format if needed - check for timestamps
        const lines = lyricsData.syncedLyrics.split('\n');
        lyricsLines = lines.map((line, idx, arr) => {
            const startTime = parseTimestampFromText(line);
            let endTime = null;
            if (idx < arr.length - 1) {
                endTime = parseTimestampFromText(arr[idx + 1]);
            } else if (startTime) {
                endTime = startTime + 3000; // Estimate 3 seconds
            }
            return {
                text: line,
                timestamp: startTime ? formatTimestamp(startTime) : '',
                startTime: startTime,
                endTime: endTime
            };
        });
    } else {
        // Plain lyrics - split by newlines
        // Check if plain lyrics have timestamps in [MM:SS.mmm] format
        const plainText = lyricsData.plainLyrics || lyricsData.lyrics || '';
        const lines = plainText.split('\n');
        lyricsLines = lines.map((line, idx, arr) => {
            // Try to extract timestamp from text
            const startTime = parseTimestampFromText(line);
            let endTime = null;
            if (idx < arr.length - 1) {
                endTime = parseTimestampFromText(arr[idx + 1]);
            } else if (startTime) {
                endTime = startTime + 3000; // Estimate 3 seconds
            }
            return {
                text: line,
                timestamp: startTime ? formatTimestamp(startTime) : '',
                startTime: startTime,
                endTime: endTime
            };
        });
    }
    
    // Clear previous selection
    selectedLyricsLines = [];
    
    // Create HTML for lyrics lines
    lyricsScrollBox.innerHTML = '';
    
    lyricsLines.forEach((line, index) => {
        if (!line.text || line.text.trim() === '') return;
        
        const lineEl = document.createElement('div');
        lineEl.className = 'lyrics-line';
        lineEl.textContent = line.text;
        lineEl.dataset.index = index;
        lineEl.dataset.timestamp = line.timestamp;
        
        // Store startTime and endTime - if not available, try to parse from text
        let startTime = line.startTime;
        if (!startTime && line.text) {
            startTime = parseTimestampFromText(line.text);
        }
        if (startTime) {
            lineEl.dataset.startTime = startTime;
        }
        
        let endTime = line.endTime;
        if (!endTime && line.text) {
            // For endTime, we can estimate based on next line or use a default duration
            // This will be handled in the selection function
        }
        if (endTime) {
            lineEl.dataset.endTime = endTime;
        }
        
        // Add hover effect (already in CSS)
        // Add click handler for selection
        lineEl.addEventListener('click', function() {
            toggleLyricLineSelection(this, lyricsLines[index]);
        });
        
        lyricsScrollBox.appendChild(lineEl);
    });
}

// Format timestamp (milliseconds to MM:SS)
function formatTimestamp(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to parse timestamp from text (e.g., [00:21.39] -> milliseconds)
function parseTimestampFromText(text) {
    if (!text) return null;
    
    // Match [MM:SS.mmm] or [MM:SS] format
    const match = text.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
    if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
        return (minutes * 60 + seconds) * 1000 + milliseconds;
    }
    return null;
}

// Toggle lyric line selection
function toggleLyricLineSelection(lineEl, lineData) {
    const index = parseInt(lineEl.dataset.index);
    const timestamp = lineEl.dataset.timestamp || lineData.timestamp || '';
    
    // Try to get startTime from dataset, then lineData, then parse from text
    let startTime = lineEl.dataset.startTime ? parseInt(lineEl.dataset.startTime, 10) : null;
    if (!startTime && lineData.startTime) {
        startTime = typeof lineData.startTime === 'string' ? parseInt(lineData.startTime, 10) : lineData.startTime;
    }
    if (!startTime) {
        // Try to parse from original text
        startTime = parseTimestampFromText(lineData.text);
    }
    
    // Try to get endTime
    let endTime = lineEl.dataset.endTime ? parseInt(lineEl.dataset.endTime, 10) : null;
    if (!endTime && lineData.endTime) {
        endTime = typeof lineData.endTime === 'string' ? parseInt(lineData.endTime, 10) : lineData.endTime;
    }
    
    // Check if already selected
    const existingIndex = selectedLyricsLines.findIndex(l => l.index === index);
    
    if (existingIndex >= 0) {
        // Deselect
        selectedLyricsLines.splice(existingIndex, 1);
        lineEl.classList.remove('selected');
    } else {
        // Clean text to remove any embedded timestamps
        let cleanText = lineData.text || '';
        // Remove timestamp patterns: [MM:SS.mmm], [MM:SS], (MM:SS), MM:SS at start or end
        cleanText = cleanText.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, ''); // Remove [MM:SS.mmm] anywhere
        cleanText = cleanText.replace(/\(\d{1,2}:\d{2}(?:\.\d{1,3})?\)/g, ''); // Remove (MM:SS.mmm) anywhere
        cleanText = cleanText.replace(/^\d{1,2}:\d{2}(?:\.\d{1,3})?\s*/g, ''); // Remove MM:SS.mmm at start
        cleanText = cleanText.replace(/\s*\d{1,2}:\d{2}(?:\.\d{1,3})?$/g, ''); // Remove MM:SS.mmm at end
        cleanText = cleanText.trim();
        
        // Select
        selectedLyricsLines.push({
            index: index,
            text: cleanText,
            timestamp: timestamp,
            startTime: startTime,
            endTime: endTime
        });
        lineEl.classList.add('selected');
    }
    
    // Update poster preview
    updateTextContent();
    
    // Apply current font to all poster text
    applyFontToPoster(currentFont);
}

// Adjust tracks list font-size to fit all tracks in a single column
// Uses simple "Fit Text to Container" algorithm
// Update track list font size scale based on slider value
function updateTrackListScale(scaleMultiplier) {
    const tracksList = document.getElementById('tracks-list-items');
    if (!tracksList) return;
    
    // Set CSS custom property for scale multiplier
    tracksList.style.setProperty('--track-scale', scaleMultiplier);
    
    // Get the current track count
    const items = tracksList.querySelectorAll('li');
    const trackCount = items.length;
    
    if (trackCount === 0) return;
    
    // Get the base font size from CSS custom properties
    const computedStyle = getComputedStyle(tracksList);
    let baseFontSize;
    
    if (trackCount <= 5) {
        baseFontSize = computedStyle.getPropertyValue('--track-font-size-1-5').trim() || 'clamp(1.12rem, 7cqw, 15.75cqw)';
    } else if (trackCount <= 10) {
        baseFontSize = computedStyle.getPropertyValue('--track-font-size-6-10').trim() || 'clamp(0.672rem, 4.2cqw, 9.45cqw)';
    } else if (trackCount <= 15) {
        baseFontSize = computedStyle.getPropertyValue('--track-font-size-11-15').trim() || 'clamp(0.42rem, 2.625cqw, 5.90625cqw)';
    } else if (trackCount <= 20) {
        baseFontSize = computedStyle.getPropertyValue('--track-font-size-16-20').trim() || 'clamp(0.297rem, 1.855cqw, 4.17375cqw)';
    } else {
        baseFontSize = computedStyle.getPropertyValue('--track-font-size-21-plus').trim() || 'clamp(0.297rem, 1.855cqw, 4.17375cqw)';
    }
    
    // Extract cqw values from clamp() and multiply by scale
    // Format: clamp(min, preferred, max) where preferred and max use cqw
    const clampMatch = baseFontSize.match(/clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (clampMatch) {
        const min = clampMatch[1].trim();
        const preferred = clampMatch[2].trim();
        const max = clampMatch[3].trim();
        
        // Multiply cqw values by scale multiplier
        const scaledPreferred = preferred.replace(/([\d.]+)cqw/g, (match, value) => {
            return (parseFloat(value) * scaleMultiplier) + 'cqw';
        });
        const scaledMax = max.replace(/([\d.]+)cqw/g, (match, value) => {
            return (parseFloat(value) * scaleMultiplier) + 'cqw';
        });
        
        // Apply scaled font size
        const scaledFontSize = `clamp(${min}, ${scaledPreferred}, ${scaledMax})`;
        tracksList.style.fontSize = scaledFontSize;
    } else {
        // Fallback: if format doesn't match, try to scale any cqw values
        const scaled = baseFontSize.replace(/([\d.]+)cqw/g, (match, value) => {
            return (parseFloat(value) * scaleMultiplier) + 'cqw';
        });
        tracksList.style.fontSize = scaled;
    }
}

function adjustTracksListFontSize() {
    const tracksList = document.getElementById('tracks-list-items');
    if (!tracksList) {
        console.log('adjustTracksListFontSize: tracksList not found');
        return;
    }
    
    const container = tracksList.parentElement; // .tracks-list
    if (!container) {
        console.log('adjustTracksListFontSize: container not found');
        return;
    }
    
    const items = tracksList.querySelectorAll('li');
    if (items.length === 0) {
        console.log('adjustTracksListFontSize: no items found');
        return;
    }
    
    console.log('adjustTracksListFontSize: Starting adjustment for', items.length, 'tracks');
    
    // CRITICAL: Completely disable CSS columns - use inline style with !important
    tracksList.style.setProperty('column-count', '1', 'important');
    tracksList.style.setProperty('column-gap', '0', 'important');
    tracksList.style.setProperty('column-width', 'auto', 'important');
    tracksList.style.setProperty('column-fill', 'auto', 'important');
    
    // Get current scale from slider
    const trackScaleSlider = document.getElementById('track-scale-slider');
    const scaleMultiplier = trackScaleSlider ? parseFloat(trackScaleSlider.value) : 1.0;
    
    // Use double requestAnimationFrame to ensure layout is fully updated
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const containerHeight = container.clientHeight;
            console.log('adjustTracksListFontSize: Container height:', containerHeight + 'px');
            
            // Start with maximum font size - use calculated size or 18px, whichever is smaller
            const trackCount = items.length;
            const calculatedFontSize = calculateTrackListFontSize(trackCount);
            const calculatedFontSizePx = parseFloat(calculatedFontSize) * parseFloat(getComputedStyle(container).fontSize);
            const maxFontSize = Math.min(calculatedFontSizePx, 18); // Cap at 18px
            
            console.log('adjustTracksListFontSize: Starting with max font size:', maxFontSize + 'px');
            
            // Simple algorithm: reduce font size until content fits
            let currentFontSize = maxFontSize;
            const minFontSize = 6; // Minimum font-size in pixels
            const stepSize = 0.5; // Reduce by 0.5px each iteration
            let iterations = 0;
            const maxIterations = 100; // Safety limit
            
            while (iterations < maxIterations && currentFontSize >= minFontSize) {
                // Set font-size
                tracksList.style.fontSize = currentFontSize + 'px';
                
                // Force reflow to ensure layout is updated
                void tracksList.offsetHeight;
                
                // Check if scrollHeight > clientHeight (overflow)
                const scrollHeight = tracksList.scrollHeight;
                const clientHeight = tracksList.clientHeight;
                const computedColumnCount = getComputedStyle(tracksList).columnCount;
                
                console.log(`adjustTracksListFontSize: Iteration ${iterations + 1}:`, {
                    fontSize: currentFontSize + 'px',
                    scrollHeight: scrollHeight + 'px',
                    clientHeight: clientHeight + 'px',
                    containerHeight: containerHeight + 'px',
                    columnCount: computedColumnCount,
                    overflows: scrollHeight > clientHeight
                });
                
                // Check if text fits (scrollHeight <= clientHeight) and column-count is still 1
                if (scrollHeight <= clientHeight && computedColumnCount === '1') {
                    console.log('adjustTracksListFontSize: SUCCESS - Text fits at', currentFontSize + 'px');
                    break;
                }
                
                // Text overflows - reduce font size and test again
                currentFontSize -= stepSize;
                iterations++;
            }
            
            // Ensure we don't go below minimum
            if (currentFontSize < minFontSize) {
                currentFontSize = minFontSize;
                tracksList.style.fontSize = currentFontSize + 'px';
                void tracksList.offsetHeight;
                console.log('adjustTracksListFontSize: Reached minimum font size:', minFontSize + 'px');
            }
            
            // Final verification
            const finalScrollHeight = tracksList.scrollHeight;
            const finalClientHeight = tracksList.clientHeight;
            const finalColumnCount = getComputedStyle(tracksList).columnCount;
            
            console.log('adjustTracksListFontSize: Final result:', {
                fontSize: currentFontSize + 'px',
                finalScrollHeight: finalScrollHeight + 'px',
                finalClientHeight: finalClientHeight + 'px',
                containerHeight: containerHeight + 'px',
                finalColumnCount,
                fits: finalScrollHeight <= finalClientHeight && finalColumnCount === '1'
            });
            
            if (finalScrollHeight > finalClientHeight || finalColumnCount !== '1') {
                console.warn('adjustTracksListFontSize: WARNING - Content still does not fit or columns detected!');
            }
            
            // After font size adjustment, apply scale from slider to maintain cqw units
            const trackScaleSlider = document.getElementById('track-scale-slider');
            if (trackScaleSlider) {
                const scaleMultiplier = parseFloat(trackScaleSlider.value);
                updateTrackListScale(scaleMultiplier);
            }
        });
    });
}

// Set up ResizeObserver to adjust font-size when container size changes
function setupTracksListFontSize() {
    const tracksList = document.getElementById('tracks-list-items');
    if (tracksList) {
        // Initial adjustment
        adjustTracksListFontSize();
        
        // Watch for size changes (e.g., when orientation/size changes)
        // Use debouncing to prevent rapid recalculations
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                adjustTracksListFontSize();
            }, 150); // Debounce for 150ms
        });
        
        const container = tracksList.parentElement;
        if (container) {
            resizeObserver.observe(container);
        }
    }
}

// Update album art in preview
function updateAlbumArt(imageSource) {
    const albumArtImage = document.getElementById('album-art-image');
    
    if (albumArtImage && imageSource) {
        // Use proxy for external URLs to avoid CORS issues
        let imageUrlToDisplay = imageSource;
        if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
            const apiBaseUrl = getApiBaseUrl();
            imageUrlToDisplay = `${apiBaseUrl}/api/image-proxy?url=${encodeURIComponent(imageSource)}`;
            albumArtImage.crossOrigin = 'anonymous';
        } else {
            albumArtImage.crossOrigin = null;
        }
        
        albumArtImage.src = imageUrlToDisplay;
        albumArtImage.style.display = 'block';
        albumArtImage.style.width = '100%';
        albumArtImage.style.height = '100%';
        albumArtImage.style.objectFit = 'cover';
    }
}

// Convert an image URL to a data URL
function convertImageUrlToDataUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Always use CORS proxy for external images to avoid CORS issues
        let imageUrlToLoad = imageUrl;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            const apiBaseUrl = getApiBaseUrl();
            imageUrlToLoad = `${apiBaseUrl}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
            img.crossOrigin = 'anonymous';
            console.log('Converting image URL to data URL via proxy:', imageUrlToLoad);
        } else if (imageUrl.startsWith('data:image')) {
            // Already a data URL, return as-is
            resolve(imageUrl);
            return;
        }
        
        img.onload = function() {
            try {
                // Create a canvas and draw the image
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Convert to data URL
                const dataUrl = canvas.toDataURL('image/png');
                console.log('Successfully converted image URL to data URL');
                resolve(dataUrl);
            } catch (error) {
                console.error('Error converting image to data URL:', error);
                reject(error);
            }
        };
        
        img.onerror = function(error) {
            console.error('Failed to load image for conversion:', imageUrlToLoad, error);
            reject(new Error(`Failed to load image: ${imageUrl}`));
        };
        
        // Set src after setting up handlers
        img.src = imageUrlToLoad;
    });
}

function extractColorPalette(img, numColors) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const maxSize = 200;
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
        if (width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
        }
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    const sampleRate = 10;
    const colorSamples = [];
    
    for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        if (a < 128) continue;
        colorSamples.push({ r, g, b });
    }
    
    return kMeansClustering(colorSamples, numColors);
}

function kMeansClustering(colors, k) {
    if (colors.length === 0) return [];
    
    const centroids = [];
    for (let i = 0; i < k; i++) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        centroids.push({ r: randomColor.r, g: randomColor.g, b: randomColor.b });
    }
    
    for (let iteration = 0; iteration < 10; iteration++) {
        const clusters = Array(k).fill().map(() => []);
        
        colors.forEach(color => {
            let minDist = Infinity;
            let nearestCluster = 0;
            
            centroids.forEach((centroid, idx) => {
                const dist = colorDistance(color, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    nearestCluster = idx;
                }
            });
            
            clusters[nearestCluster].push(color);
        });
        
        centroids.forEach((centroid, idx) => {
            if (clusters[idx].length > 0) {
                const sum = clusters[idx].reduce((acc, color) => {
                    acc.r += color.r;
                    acc.g += color.g;
                    acc.b += color.b;
                    return acc;
                }, { r: 0, g: 0, b: 0 });
                
                centroid.r = Math.round(sum.r / clusters[idx].length);
                centroid.g = Math.round(sum.g / clusters[idx].length);
                centroid.b = Math.round(sum.b / clusters[idx].length);
            }
        });
    }
    
    return centroids.map(centroid => rgbToHex(centroid.r, centroid.g, centroid.b));
}

function colorDistance(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function displayColorPalette(palette) {
    // Hide the customization section palette display
    const paletteDisplay = document.getElementById('color-palette-display');
    if (paletteDisplay) {
        paletteDisplay.style.display = 'none';
    }
    
    // Update the poster preview palette swatches (sorted from lightest to darkest)
    updatePosterPaletteSwatches(palette);
}

// Update poster palette swatches using CSS custom properties (avoids inline style override)
function updatePosterPaletteSwatches(palette) {
    const swatchesContainer = document.getElementById('poster-palette-swatches');
    if (!swatchesContainer) return;
    
    // Clear existing swatches
    swatchesContainer.innerHTML = '';
    
    // Sort palette from lightest to darkest
    const sortedPalette = sortPaletteByLightness(palette);
    
    // Create swatches for each color in the palette (max 5)
    const colorsToShow = sortedPalette.slice(0, 5);
    
    colorsToShow.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        // Set background color directly
        swatch.style.backgroundColor = color;
        swatch.setAttribute('data-color', color);
        swatch.title = color;
        swatchesContainer.appendChild(swatch);
    });
    
    // If we have fewer than 5 colors, fill with placeholder swatches (lightest to darkest greys)
    const defaultGreys = ['#f5f5f5', '#cccccc', '#999999', '#666666', '#333333'];
    let greyIndex = 0;
    while (swatchesContainer.children.length < 5) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        const greyColor = defaultGreys[greyIndex];
        swatch.style.backgroundColor = greyColor;
        swatch.setAttribute('data-color', greyColor);
        swatchesContainer.appendChild(swatch);
        greyIndex++;
    }
}

function getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Get lightness/value of a color (0-1, where 1 is lightest)
function getColorLightness(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Use relative luminance formula
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Sort palette from lightest to darkest
function sortPaletteByLightness(palette) {
    return [...palette].sort((a, b) => {
        return getColorLightness(b) - getColorLightness(a); // Descending (lightest first)
    });
}

// Update Poster Preview
function updatePosterPreview() {
    const preview = document.getElementById('poster-preview');
    
    if (!currentLyrics && currentPalette.length === 0) {
        preview.innerHTML = '<div class="poster-placeholder"><p>Enter artist and song title, then click "Load Song Data" to generate your poster</p></div>';
        return;
    }
    
    const bgColor = currentPalette.length > 0 ? currentPalette[0] : '#667eea';
    const textColor = getContrastColor(bgColor);
    const accentColor = currentPalette.length > 1 ? currentPalette[1] : '#ffffff';
    
    const fontFamily = currentFont.replace(' ', '+');
    
    preview.innerHTML = `
        <div class="poster-content" style="
            background: linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 100%);
            color: ${textColor};
            padding: 3rem;
            border-radius: 10px;
            min-height: 400px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-family: '${currentFont}', sans-serif;
        ">
            <div class="poster-header">
                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem; font-weight: 700;">${currentTitle || 'Song Title'}</h2>
                <p style="font-size: 1.25rem; opacity: 0.9;">${currentArtist || 'Artist Name'}</p>
            </div>
            <div class="poster-lyrics" style="
                margin-top: 2rem;
                font-size: 1rem;
                line-height: 1.8;
                max-height: 250px;
                overflow-y: auto;
                white-space: pre-wrap;
            ">
                ${currentLyrics ? currentLyrics.substring(0, 500) + (currentLyrics.length > 500 ? '...' : '') : 'No lyrics available'}
            </div>
            <button class="save-poster-btn" onclick="savePoster()" style="
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: ${textColor};
                color: ${bgColor};
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: 600;
            ">Save Poster</button>
        </div>
    `;
}

// Save Poster to Gallery
function savePoster() {
    const preview = document.getElementById('poster-preview');
    const posterContent = preview.querySelector('.poster-content');
    
    if (!posterContent) return;
    
    // Create gallery item
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item fade-in';
    
    galleryItem.innerHTML = `
        <div style="padding: 1rem;">
            <h3 style="margin-bottom: 0.5rem;">${currentTitle}</h3>
            <p style="color: var(--text-light); margin-bottom: 1rem;">${currentArtist}</p>
            <div style="
                background: linear-gradient(135deg, ${currentPalette[0] || '#667eea'} 0%, ${currentPalette[1] || '#764ba2'} 100%);
                height: 200px;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${getContrastColor(currentPalette[0] || '#667eea')};
                font-weight: 700;
                font-size: 1.5rem;
            ">
                ${currentTitle}
            </div>
        </div>
    `;
    
    galleryItem.addEventListener('click', () => {
        // Expand to show full poster
        showPosterModal();
    });
    
    galleryGrid.appendChild(galleryItem);
    showNotification('Poster saved to gallery!');
    
    // Scroll to gallery
    setTimeout(() => {
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

function showPosterModal() {
    // Create modal for full poster view
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        cursor: pointer;
    `;
    
    const bgColor = currentPalette.length > 0 ? currentPalette[0] : '#667eea';
    const textColor = getContrastColor(bgColor);
    const accentColor = currentPalette.length > 1 ? currentPalette[1] : '#ffffff';
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 100%);
            color: ${textColor};
            padding: 3rem;
            border-radius: 10px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: '${currentFont}', sans-serif;
        ">
            <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem;">${currentTitle}</h2>
            <p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9;">${currentArtist}</p>
            <pre style="white-space: pre-wrap; line-height: 1.8;">${currentLyrics}</pre>
        </div>
    `;
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    
    // Set background color based on type
    let bgColor = '#4CAF50'; // Default success (green)
    if (type === 'error') {
        bgColor = '#f44336'; // Red for errors
    } else if (type === 'warning') {
        bgColor = '#ff9800'; // Orange for warnings
    }
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// SAVE AND EXPORT FUNCTIONS
// ============================================

// Helper function to wait for fonts to load
async function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        // Additional wait to ensure fonts are fully rendered and applied
        await new Promise(resolve => setTimeout(resolve, 200));
    } else {
        // Fallback if fonts API is not available
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// Helper function to explicitly set font weights as inline styles
function preserveFontWeights(element) {
    const allElements = element.querySelectorAll('*');
    const originalStyles = new Map();
    
    allElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const fontWeight = computedStyle.fontWeight;
        const fontFamily = computedStyle.fontFamily;
        
        // Store original inline style if any
        originalStyles.set(el, {
            fontWeight: el.style.fontWeight,
            fontFamily: el.style.fontFamily
        });
        
        // Explicitly set font-weight and font-family as inline styles
        // This ensures html2canvas captures them correctly
        if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
            el.style.fontWeight = fontWeight;
        }
        if (fontFamily) {
            el.style.fontFamily = fontFamily;
        }
    });
    
    return originalStyles;
}

// Helper function to restore original inline styles
function restoreFontWeights(originalStyles) {
    originalStyles.forEach((styles, el) => {
        if (styles.fontWeight) {
            el.style.fontWeight = styles.fontWeight;
        } else {
            el.style.fontWeight = '';
        }
        if (styles.fontFamily) {
            el.style.fontFamily = styles.fontFamily;
        } else {
            el.style.fontFamily = '';
        }
    });
}

// Helper function to get accurate spacing for list markers
function getListMarkerSpacing(listElement, listItem) {
    // With list-style-position: inside, the marker is part of the content
    // We need to estimate the width of the marker based on the number of digits
    const listItems = listElement.querySelectorAll('li');
    const maxDigits = String(listItems.length).length;
    
    // Get font size to calculate spacing
    const liStyle = window.getComputedStyle(listItem);
    const fontSize = parseFloat(liStyle.fontSize);
    
    // Estimate marker width: each digit is roughly 0.6em, plus period (0.3em), plus spacing (0.3em)
    // For inside positioning, the marker takes up space in the content flow
    const estimatedMarkerWidth = (maxDigits * 0.6 + 0.3 + 0.3) * fontSize;
    
    return `${estimatedMarkerWidth}px`;
}

// Helper function to convert poster to image using html2canvas
async function capturePosterAsImage() {
    const posterCanvas = document.getElementById('poster-preview');
    if (!posterCanvas) {
        throw new Error('Poster preview not found');
    }
    
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library not loaded. Please refresh the page.');
    }
    
    // Wait for fonts to load before capturing
    await waitForFonts();
    
    // Step 1: Preserve font weights by setting them as inline styles
    const originalFontStyles = preserveFontWeights(posterCanvas);
    
    // Step 2: Fix track list numbers - add numbers manually to match CSS list markers
    const tracksList = document.getElementById('tracks-list-items');
    const originalHTML = [];
    const originalListStyleType = tracksList ? tracksList.style.listStyleType : '';
    let numbersAdded = false;
    
    if (tracksList) {
        const listItems = tracksList.querySelectorAll('li');
        if (listItems.length > 0) {
            // Get spacing based on the list structure
            const markerSpacing = getListMarkerSpacing(tracksList, listItems[0]);
            
            listItems.forEach((li, index) => {
                // Store original HTML
                originalHTML.push(li.innerHTML);
                
                // Get the original text content
                const originalText = li.textContent.trim();
                const trackNumber = index + 1;
                
                // Get computed styles
                const liStyle = window.getComputedStyle(li);
                
                // Clear and rebuild with number positioned correctly
                li.innerHTML = '';
                
                // Create number span - position it to match list marker behavior
                const numberSpan = document.createElement('span');
                numberSpan.textContent = `${trackNumber}.`;
                numberSpan.style.display = 'inline';
                // Use calculated spacing
                numberSpan.style.marginRight = markerSpacing;
                // Copy all font properties exactly to match list item
                numberSpan.style.fontFamily = liStyle.fontFamily;
                numberSpan.style.fontSize = liStyle.fontSize;
                numberSpan.style.fontWeight = liStyle.fontWeight;
                numberSpan.style.fontStyle = liStyle.fontStyle;
                numberSpan.style.color = liStyle.color;
                numberSpan.style.lineHeight = liStyle.lineHeight;
                numberSpan.style.verticalAlign = 'baseline';
                
                // Add the text content
                const textNode = document.createTextNode(originalText);
                
                li.appendChild(numberSpan);
                li.appendChild(textNode);
            });
            
            // Remove list-style since we're adding numbers manually
            tracksList.style.listStyleType = 'none';
            
            numbersAdded = true;
        }
    }
    
    try {
        // Capture the poster as canvas
        const canvas = await html2canvas(posterCanvas, {
            backgroundColor: null, // Transparent background
            scale: 2, // Higher quality (2x resolution)
            logging: false,
            useCORS: true, // Allow cross-origin images
            allowTaint: false,
            fontEmbedCSS: true,
            removeContainer: false,
            // Ensure fonts are loaded in cloned document
            onclone: (clonedDoc) => {
                // Explicitly set font weights in cloned document
                const clonedPoster = clonedDoc.getElementById('poster-preview');
                if (clonedPoster) {
                    const allElements = clonedPoster.querySelectorAll('*');
                    allElements.forEach(el => {
                        const style = clonedDoc.defaultView.getComputedStyle(el);
                        // Explicitly set font-weight as inline style
                        if (style.fontWeight && style.fontWeight !== 'normal' && style.fontWeight !== '400') {
                            el.style.fontWeight = style.fontWeight;
                        }
                        if (style.fontFamily) {
                            el.style.fontFamily = style.fontFamily;
                        }
                    });
                }
            }
        });
        
        // Restore original list item HTML and list style
        if (numbersAdded && tracksList) {
            const listItems = tracksList.querySelectorAll('li');
            listItems.forEach((li, index) => {
                if (originalHTML[index] !== undefined) {
                    li.innerHTML = originalHTML[index];
                }
            });
            // Restore list style
            tracksList.style.listStyleType = originalListStyleType;
        }
        
        // Restore original font styles
        restoreFontWeights(originalFontStyles);
        
        return canvas;
    } catch (error) {
        // Make sure to restore everything even if there's an error
        if (numbersAdded && tracksList) {
            const listItems = tracksList.querySelectorAll('li');
            listItems.forEach((li, index) => {
                if (originalHTML[index] !== undefined) {
                    li.innerHTML = originalHTML[index];
                }
            });
            // Restore list style
            tracksList.style.listStyleType = originalListStyleType;
        }
        restoreFontWeights(originalFontStyles);
        console.error('Error capturing poster:', error);
        throw error;
    }
}

// SAVE AS: Download poster as image with custom filename
async function savePosterAs() {
    try {
        // Check if poster has been created
        if (!currentTitle || !currentArtist) {
            alert('Please create a poster first by clicking CREATE');
            return;
        }
        
        // Prompt for filename
        const defaultFilename = `${currentArtist}_${currentTitle}_poster`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = prompt('Enter filename (without extension):', defaultFilename) || defaultFilename;
        
        if (!filename) return; // User cancelled
        
        // Capture poster as image
        const canvas = await capturePosterAsImage();
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
            if (!blob) {
                alert('Error generating image. Please try again.');
                return;
            }
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showNotification('Poster saved as image!');
        }, 'image/png');
        
    } catch (error) {
        console.error('Error saving poster:', error);
        alert('Error saving poster: ' + error.message);
    }
}

// SAVE: Save poster to localStorage/gallery
async function savePosterToGallery() {
    try {
        // Check if poster has been created
        if (!currentTitle || !currentArtist) {
            alert('Please create a poster first by clicking CREATE');
            return;
        }
        
        // Capture poster as image
        const canvas = await capturePosterAsImage();
        
        // Create a compressed version for gallery storage (smaller file size)
        // Use JPEG with lower quality and smaller dimensions for gallery thumbnails
        const galleryCanvas = document.createElement('canvas');
        const maxGalleryWidth = 800; // Max width for gallery thumbnails
        const maxGalleryHeight = 1200; // Max height for gallery thumbnails
        const scale = Math.min(maxGalleryWidth / canvas.width, maxGalleryHeight / canvas.height, 1);
        
        galleryCanvas.width = canvas.width * scale;
        galleryCanvas.height = canvas.height * scale;
        const galleryCtx = galleryCanvas.getContext('2d');
        galleryCtx.drawImage(canvas, 0, 0, galleryCanvas.width, galleryCanvas.height);
        
        // Convert to compressed JPEG data URL (much smaller than PNG)
        const imageDataUrl = galleryCanvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
        
        // Get existing gallery from localStorage
        let gallery = JSON.parse(localStorage.getItem('posterGallery') || '[]');
        
        // Check if a poster with the same album and artist already exists
        const existingIndex = gallery.findIndex(item => 
            item.title && item.artist &&
            item.title.toLowerCase().trim() === currentTitle.toLowerCase().trim() &&
            item.artist.toLowerCase().trim() === currentArtist.toLowerCase().trim()
        );
        
        // Get poster canvas attributes for size and orientation
        const posterCanvas = document.getElementById('poster-preview');
        const posterSize = posterCanvas ? posterCanvas.getAttribute('data-size') || 'tabloid' : 'tabloid';
        const posterOrientation = posterCanvas ? posterCanvas.getAttribute('data-orientation') || 'vertical' : 'vertical';
        const textType = currentTextType || 'description';
        
        // Convert album image to data URL if it's a URL (not already a data URL)
        let albumImageDataUrl = pendingImageSource || null;
        if (pendingImageSource) {
            if (pendingImageSource.startsWith('data:image')) {
                // Already a data URL, use as-is
                albumImageDataUrl = pendingImageSource;
                console.log('Album image is already a data URL, using as-is');
            } else if (pendingImageSource.startsWith('http://') || pendingImageSource.startsWith('https://')) {
                // It's a URL, convert to data URL
                console.log('Converting album image URL to data URL:', pendingImageSource);
                try {
                    albumImageDataUrl = await convertImageUrlToDataUrl(pendingImageSource);
                    console.log('Successfully converted album image to data URL');
                } catch (error) {
                    console.error('Error converting album image URL to data URL:', error);
                    // Don't fallback to URL - this will cause CORS issues when loading later
                    // Instead, show an error to the user
                    alert('Warning: Could not save album image. The image URL may not be accessible. Please try uploading the image as a file instead.');
                    albumImageDataUrl = null; // Set to null so we don't save a broken URL
                }
            } else {
                // Unknown format, try to use as-is
                console.warn('Unknown image source format:', pendingImageSource);
                albumImageDataUrl = pendingImageSource;
            }
        }
        
        // Create gallery item with all poster data
        const galleryItem = {
            id: existingIndex >= 0 ? gallery[existingIndex].id : Date.now().toString(),
            title: currentTitle,
            artist: currentArtist,
            imageData: imageDataUrl, // Poster image for gallery display
            albumImageUrl: albumImageDataUrl, // Album image as data URL (or original if already data URL)
            timestamp: new Date().toISOString(),
            albumData: {
                tracks: currentAlbumData.tracks || [],
                releaseDate: currentAlbumData.releaseDate || '',
                runtime: currentAlbumData.runtime || '',
                description: currentAlbumData.description || ''
            },
            palette: currentPalette || [],
            font: currentFont || 'Roboto',
            size: posterSize,
            orientation: posterOrientation,
            textType: textType,
            lyrics: textType === 'lyrics' ? selectedLyricsLines : null
        };
        
        if (existingIndex >= 0) {
            // Replace existing poster
            gallery[existingIndex] = galleryItem;
            showNotification('Poster updated in gallery!');
        } else {
            // Add new poster to gallery
            gallery.unshift(galleryItem); // Add to beginning
            
            // Limit gallery size to prevent localStorage overflow (keep last 20)
            // Reduced from 50 to 20 because compressed images still take space
            if (gallery.length > 20) {
                gallery = gallery.slice(0, 20);
            }
            
            showNotification('Poster saved to gallery!');
        }
        
        // Save to localStorage with error handling for quota exceeded
        try {
            localStorage.setItem('posterGallery', JSON.stringify(gallery));
        } catch (storageError) {
            if (storageError.name === 'QuotaExceededError') {
                // If still too large, remove oldest posters and try again
                console.warn('localStorage quota exceeded, removing oldest posters...');
                while (gallery.length > 5) {
                    gallery.pop(); // Remove oldest
                }
                try {
                    localStorage.setItem('posterGallery', JSON.stringify(gallery));
                    showNotification('Gallery full! Removed oldest posters to save this one.', 'warning');
                } catch (retryError) {
                    // If still failing, clear gallery and save just this one
                    localStorage.removeItem('posterGallery');
                    gallery = [galleryItem];
                    localStorage.setItem('posterGallery', JSON.stringify(gallery));
                    showNotification('Gallery was full. Cleared and saved your poster.', 'warning');
                }
            } else {
                throw storageError; // Re-throw if it's a different error
            }
        }
        
        // Only call savePoster if we're on a page with a gallery-grid element
        const galleryGrid = document.getElementById('gallery-grid');
        if (galleryGrid && typeof savePoster === 'function') {
            savePoster();
        }
        
    } catch (error) {
        console.error('Error saving poster to gallery:', error);
        
        if (error.name === 'QuotaExceededError') {
            showNotification('Gallery storage is full. Please delete some posters or clear your browser storage.', 'error');
        } else {
            showNotification('Error saving poster: ' + error.message, 'error');
        }
    }
}

// EXPORT: Export poster as high-quality image file
async function exportPoster() {
    try {
        // Check if poster has been created
        if (!currentTitle || !currentArtist) {
            alert('Please create a poster first by clicking CREATE');
            return;
        }
        
        // Prompt for filename
        const defaultFilename = `${currentArtist}_${currentTitle}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = prompt('Enter filename (without extension):', defaultFilename);
        
        if (filename === null) {
            // User cancelled
            return;
        }
        
        // Prompt for file type
        const fileType = prompt('Choose file type:\n1. PNG (best quality, larger file)\n2. JPEG (smaller file, good quality)\n\nEnter 1 for PNG or 2 for JPEG:', '1');
        
        if (fileType === null) {
            // User cancelled
            return;
        }
        
        // Determine MIME type and extension
        let mimeType, extension;
        const isJPEG = fileType.trim() === '2' || fileType.toLowerCase() === 'jpeg' || fileType.toLowerCase() === 'jpg';
        
        if (isJPEG) {
            mimeType = 'image/jpeg';
            extension = 'jpg';
        } else {
            // Default to PNG
            mimeType = 'image/png';
            extension = 'png';
        }
        
        // Capture poster as high-quality image
        const canvas = await capturePosterAsImage();
        
        // Convert to blob with selected format
        // PNG doesn't use quality parameter, JPEG does
        const blobCallback = (blob) => {
            if (!blob) {
                alert('Error generating image. Please try again.');
                return;
            }
            
            // Sanitize filename
            const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() || defaultFilename;
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${sanitizedFilename}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showNotification(`Poster exported as ${extension.toUpperCase()}!`);
        };
        
        if (isJPEG) {
            // JPEG with quality parameter
            canvas.toBlob(blobCallback, mimeType, 0.95); // High quality JPEG
        } else {
            // PNG without quality parameter
            canvas.toBlob(blobCallback, mimeType);
        }
        
    } catch (error) {
        console.error('Error exporting poster:', error);
        alert('Error exporting poster: ' + error.message);
    }
}


// Utility function to make text fit on one line by adjusting font-size (from script.js)
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
    let max = containerWidth * 10;
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
                testSize = Math.floor(testSize * 1.5);
            } else {
                break;
            }
        }
        max = optimalSize * 2;
    }
    
    // Now binary search within the range to find exact maximum
    while (max - min > 1) {
        const mid = Math.floor((min + max) / 2);
        tempSpan.style.fontSize = mid + 'px';
        const textWidth = tempSpan.offsetWidth;
        
        if (textWidth <= containerWidth) {
            optimalSize = mid;
            min = mid;
        } else {
            max = mid;
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
        }, 100);
    });
    
    resizeObserver.observe(element.parentElement);
    
    // Also listen to window resize
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            fitTextToLine(element, minFontSize);
        }, 100);
    });
}

// Gallery functionality
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    
    // Set active navigation link
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === 'gallery.html') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Auto-fit h1 title to one line (same as index.html)
    const titleElement = document.getElementById('title');
    if (titleElement) {
        autoFitTextToLine(titleElement, 20); // Min font-size only, no max
    }
});

// Load and display saved posters from localStorage
function loadGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    const emptyGallery = document.getElementById('empty-gallery');
    
    if (!galleryGrid) return;
    
    // Get saved posters from localStorage
    const gallery = JSON.parse(localStorage.getItem('posterGallery') || '[]');
    
    if (gallery.length === 0) {
        galleryGrid.style.display = 'none';
        if (emptyGallery) {
            emptyGallery.style.display = 'block';
        }
        return;
    }
    
    // Show gallery grid (CSS handles display: flex)
    // Remove any inline display style to let CSS take over
    galleryGrid.style.display = '';
    if (emptyGallery) {
        emptyGallery.style.display = 'none';
    }
    
    // Clear existing items
    galleryGrid.innerHTML = '';
    
    // Create gallery items
    gallery.forEach((item, index) => {
        const galleryItem = createGalleryItem(item, index);
        galleryGrid.appendChild(galleryItem);
    });
}

// Create a gallery item element
function createGalleryItem(item, index) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    // Make title uppercase, capitalize artist
    const uppercaseTitle = item.title ? item.title.toUpperCase() : item.title;
    const capitalizedArtist = item.artist ? item.artist.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ') : item.artist;
    
    div.innerHTML = `
        <img src="${item.imageData}" alt="${uppercaseTitle}" class="gallery-item-image">
        <div class="gallery-item-info">
            <div class="gallery-item-title">${uppercaseTitle}</div>
            <div class="gallery-item-artist">${capitalizedArtist}</div>
            <div class="gallery-item-date">${formattedDate}</div>
        </div>
        <div class="gallery-item-actions">
            <button class="gallery-action-btn" onclick="editPoster(${index})">EDIT</button>
            <button class="gallery-action-btn" onclick="exportPosterFromGallery(${index})">EXPORT</button>
            <button class="gallery-action-btn" onclick="deletePoster(${index})">DELETE</button>
        </div>
    `;
    
    return div;
}

// Edit poster - load it back into the create page
function editPoster(index) {
    const gallery = JSON.parse(localStorage.getItem('posterGallery') || '[]');
    
    if (index < 0 || index >= gallery.length) {
        alert('Poster not found');
        return;
    }
    
    const item = gallery[index];
    
    // Store the poster data in sessionStorage to load in create page
    sessionStorage.setItem('editPosterData', JSON.stringify(item));
    
    // Redirect to create page
    window.location.href = 'index.html';
}

// Export poster from gallery
async function exportPosterFromGallery(index) {
    const gallery = JSON.parse(localStorage.getItem('posterGallery') || '[]');
    
    if (index < 0 || index >= gallery.length) {
        alert('Poster not found');
        return;
    }
    
    const item = gallery[index];
    
    try {
        // Convert data URL to blob
        const response = await fetch(item.imageData);
        const blob = await response.blob();
        
        // Create filename
        const timestamp = new Date(item.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${item.artist}_${item.title}_${timestamp}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('Poster exported successfully!');
    } catch (error) {
        console.error('Error exporting poster:', error);
        alert('Error exporting poster: ' + error.message);
    }
}

// Delete poster from gallery
function deletePoster(index) {
    if (!confirm('Are you sure you want to delete this poster?')) {
        return;
    }
    
    const gallery = JSON.parse(localStorage.getItem('posterGallery') || '[]');
    
    if (index < 0 || index >= gallery.length) {
        alert('Poster not found');
        return;
    }
    
    // Remove the poster
    gallery.splice(index, 1);
    
    // Save back to localStorage
    localStorage.setItem('posterGallery', JSON.stringify(gallery));
    
    // Reload gallery
    loadGallery();
    
    showNotification('Poster deleted');
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: #000;
        color: #fff;
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
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


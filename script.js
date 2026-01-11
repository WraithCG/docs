document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================================
    // 1. GLOBAL VARIABLES & ELEMENTS
    // =========================================================================
    const landingView = document.getElementById('landing-view');
    const docsView = document.getElementById('docs-view');
    const projectGrid = document.getElementById('project-grid');
    const projectSelector = document.getElementById('project-selector');
    
    const sidebarList = document.getElementById('section-list');
    const mainContent = document.getElementById('main-content');
    const searchInput = document.getElementById('search-input');
    
    const homeBtn = document.getElementById('home-btn');
    const themeBtn = document.getElementById('theme-btn');

    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    // State Management
    let allProjectsIndex = [];      // Data from data.json
    let currentProjectData = null;  // Data from project.json
    let currentSections = [];       // List of sections for navigation

    // =========================================================================
    // 2. INITIALIZATION
    // =========================================================================
    initStarfield();
    fetchProjectIndex();
    applyRandomTheme();

    // =========================================================================
    // 3. EVENT LISTENERS
    // =========================================================================
    
    // Navigation
    if(homeBtn) homeBtn.addEventListener('click', showLandingPage);
    
    // Project Switcher Dropdown
    if(projectSelector) {
        projectSelector.addEventListener('change', (e) => {
            loadProjectDocumentation(e.target.value);
        });
    }

    // Theme Toggle
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            cycleTheme();
            initStarfield(); // Re-init stars to match new theme color
        });
    }

    // Search Input
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSidebar(e.target.value.toLowerCase());
        });
    }

    // Lightbox Interaction
    if(lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if(lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // =========================================================================
    // 4. IMAGE LAZY LOADING (Observer)
    // =========================================================================
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src; // Swap placeholder for real image
                img.onload = () => {
                    img.classList.remove('lazy');
                    img.classList.add('loaded');
                    img.removeAttribute('min-height');
                };
                observer.unobserve(img);
            }
        });
    }, { rootMargin: "100px" });

    // =========================================================================
    // 5. CORE LOGIC: INDEX & LOADING
    // =========================================================================

    function fetchProjectIndex() {
        fetch('data.json')
            .then(res => res.json())
            .then(projects => {
                allProjectsIndex = projects;
                renderLandingPage(projects);
                populateDropdown(projects);
            })
            .catch(err => {
                console.error("Error loading data.json:", err);
                projectGrid.innerHTML = '<p style="color:white;">Error loading data.json. Ensure local server is running.</p>';
            });
    }

    function renderLandingPage(projects) {
        projectGrid.innerHTML = '';
        projects.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <img src="${proj.image}" class="card-image" alt="${proj.title}">
                <div class="card-content">
                    <h3>${proj.title}</h3>
                    <p>${proj.description}</p>
                </div>
            `;
            // Load project on click
            card.addEventListener('click', () => loadProjectDocumentation(proj.path));
            projectGrid.appendChild(card);
        });
    }

    function populateDropdown(projects) {
        projectSelector.innerHTML = '<option value="" disabled selected>Switch Project...</option>';
        projects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.path;
            option.textContent = proj.title;
            projectSelector.appendChild(option);
        });
    }

    function loadProjectDocumentation(jsonPath) {
        // Show Loading UI
        mainContent.innerHTML = '<div class="placeholder"><p>Loading Project Data...</p></div>';
        
        // Sync Dropdown
        if(projectSelector) projectSelector.value = jsonPath;

        fetch(jsonPath)
            .then(res => res.json())
            .then(projectData => {
                currentProjectData = projectData;
                currentSections = projectData.sections;
                
                showDocsInterface();
                initSidebar(projectData.sections);
                
                // Reset Search
                if(searchInput) searchInput.value = ''; 
            })
            .catch(err => {
                console.error("Error loading project:", err);
                mainContent.innerHTML = `<div class="placeholder"><p>Error loading ${jsonPath}</p></div>`;
            });
    }

    // =========================================================================
    // 6. SIDEBAR & SEARCH LOGIC
    // =========================================================================

    function initSidebar(sectionsToRender) {
        sidebarList.innerHTML = ''; 
        
        if(!sectionsToRender || sectionsToRender.length === 0) {
            sidebarList.innerHTML = '<li class="no-results">No sections found</li>';
            return;
        }

        sectionsToRender.forEach((section, index) => {
            const li = document.createElement('li');
            li.textContent = section.title;
            
            // We use the index from the original array to keep navigation sync correct
            // If filtering, we might need a reference to the original index, 
            // but for simplicity, we render the filtered list.
            const originalIndex = currentSections.indexOf(section);
            li.dataset.index = originalIndex; 

            li.addEventListener('click', () => {
                updateSidebarActive(originalIndex);
                renderContent(section, originalIndex);
            });

            // Auto-load first section if it's the initial load (search empty)
            if (index === 0 && (!searchInput || !searchInput.value)) {
                li.classList.add('active');
                renderContent(section, originalIndex);
            }
            
            sidebarList.appendChild(li);
        });
    }

    function filterSidebar(query) {
        if (!currentProjectData) return;

        if (!query) {
            initSidebar(currentProjectData.sections);
            return;
        }

        // Deep Search: Title OR Content
        const filtered = currentProjectData.sections.filter(section => {
            // Check Title
            if (section.title.toLowerCase().includes(query)) return true;
            
            // Check Content Blocks
            return section.content.some(block => {
                if (block.value && typeof block.value === 'string') {
                    return block.value.toLowerCase().includes(query);
                }
                return false;
            });
        });

        initSidebar(filtered);
    }

    function updateSidebarActive(index) {
        document.querySelectorAll('#section-list li').forEach(el => el.classList.remove('active'));
        const activeLi = document.querySelector(`#section-list li[data-index="${index}"]`);
        if(activeLi) {
            activeLi.classList.add('active');
            activeLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // =========================================================================
    // 7. CONTENT RENDERING ENGINE
    // =========================================================================

    function renderContent(section, currentIndex) {
        mainContent.innerHTML = '';
        
        // Page Title
        const title = document.createElement('h1');
        title.className = 'doc-title';
        title.textContent = section.title;
        mainContent.appendChild(title);

        // Render Blocks
        section.content.forEach(block => {
            let el;
            
            // --- HEADER ---
            if (block.type === 'header') {
                el = document.createElement('h2');
                el.innerHTML = block.value;
            } 
            // --- RICH TEXT ---
            else if (block.type === 'text') {
                el = document.createElement('div');
                el.className = 'text-block';
                el.innerHTML = block.value;
            } 
            // --- NOTE BLOCK ---
            else if (block.type === 'note') {
                el = document.createElement('div');
                el.className = 'note-block';
                el.innerHTML = `<i class='bx bx-info-circle'></i> <div>${block.value}</div>`;
            }
            // --- TIP BLOCK ---
            else if (block.type === 'tip') {
                el = document.createElement('div');
                el.className = 'tip-block';
                el.innerHTML = `<i class='bx bx-bulb'></i> <div>${block.value}</div>`;
            }
            // --- IMAGE BLOCK (Lazy + Zoom) ---
            else if (block.type === 'image') {
                const wrap = document.createElement('div');
                wrap.className = `img-wrap ${block.align}`;
                
                const img = document.createElement('img');
                img.dataset.src = block.src; // For Lazy Load
                img.className = 'lazy';
                img.alt = block.caption || "Doc Image";
                
                // Zoom
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => openLightbox(block.src));

                // Lazy Load
                imageObserver.observe(img);

                wrap.appendChild(img);

                if(block.caption) {
                    const cap = document.createElement('span');
                    cap.className = 'caption';
                    cap.textContent = block.caption;
                    wrap.appendChild(cap);
                }
                el = wrap;
            }
            // --- ROADMAP BLOCK (Interactive) ---
            else if (block.type === 'roadmap') {
                const container = document.createElement('div');
                container.className = 'roadmap-container';

                block.milestones.forEach(milestone => {
                    const item = document.createElement('div');
                    const statusClass = `status-${milestone.status.toLowerCase().replace(' ', '-')}`;
                    item.className = `roadmap-item ${statusClass}`;

                    const featureList = milestone.features.map(f => `<li>${f}</li>`).join('');

                    item.innerHTML = `
                        <div class="roadmap-content">
                            <div class="roadmap-header-group">
                                <div class="rm-meta">
                                    <span class="rm-version">${milestone.version}</span>
                                    <span class="rm-date">${milestone.date}</span>
                                </div>
                                <i class='bx bx-chevron-down rm-toggle-icon'></i>
                            </div>
                            <div class="roadmap-details">
                                <ul class="rm-features">${featureList}</ul>
                            </div>
                        </div>
                    `;

                    // Toggle Interaction
                    const header = item.querySelector('.roadmap-header-group');
                    header.addEventListener('click', () => {
                        item.classList.toggle('expanded');
                    });

                    container.appendChild(item);
                });
                el = container;
            }

            if (el) mainContent.appendChild(el);
        });

        // --- NAVIGATION BUTTONS (Prev / Next) ---
        if((!searchInput || !searchInput.value) && currentIndex !== undefined) {
            renderNavButtons(currentIndex);
        }

        // Clearfix & Scroll Top
        const clear = document.createElement('div');
        clear.style.clear = 'both';
        mainContent.appendChild(clear);
        mainContent.scrollTop = 0;
    }

    function renderNavButtons(currentIndex) {
        const navContainer = document.createElement('div');
        navContainer.className = 'page-nav';

        // Prev Button
        if (currentIndex > 0) {
            const prevSection = currentSections[currentIndex - 1];
            const prevBtn = document.createElement('div');
            prevBtn.className = 'nav-btn prev';
            prevBtn.innerHTML = `
                <i class='bx bx-chevron-left'></i>
                <div>
                    <span class="nav-label">Previous</span>
                    <span class="nav-title">${prevSection.title}</span>
                </div>
            `;
            prevBtn.addEventListener('click', () => {
                updateSidebarActive(currentIndex - 1);
                renderContent(prevSection, currentIndex - 1);
            });
            navContainer.appendChild(prevBtn);
        }

        // Next Button
        if (currentIndex < currentSections.length - 1) {
            const nextSection = currentSections[currentIndex + 1];
            const nextBtn = document.createElement('div');
            nextBtn.className = 'nav-btn next';
            nextBtn.innerHTML = `
                <div>
                    <span class="nav-label">Next</span>
                    <span class="nav-title">${nextSection.title}</span>
                </div>
                <i class='bx bx-chevron-right'></i>
            `;
            nextBtn.addEventListener('click', () => {
                updateSidebarActive(currentIndex + 1);
                renderContent(nextSection, currentIndex + 1);
            });
            navContainer.appendChild(nextBtn);
        }

        mainContent.appendChild(navContainer);
    }

    // =========================================================================
    // 8. VIEW SWITCHING & LIGHTBOX
    // =========================================================================

    function showDocsInterface() {
        landingView.classList.add('hidden');
        docsView.classList.remove('hidden');
    }

    function showLandingPage() {
        docsView.classList.add('hidden');
        landingView.classList.remove('hidden');
        if(projectSelector) projectSelector.value = ""; // Reset dropdown
    }

    function openLightbox(src) {
        if(lightboxImg) lightboxImg.src = src;
        if(lightbox) lightbox.classList.add('active');
    }

    function closeLightbox() {
        if(lightbox) lightbox.classList.remove('active');
        setTimeout(() => { if(lightboxImg) lightboxImg.src = ''; }, 300);
    }

}); // End DOMContentLoaded

// =========================================================================
// 9. VISUAL EFFECTS HELPER FUNCTIONS
// =========================================================================
function applyRandomTheme() {
    const themes = ['theme-default', 'theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    // Clean up old classes before adding new ones
    document.body.classList.remove('theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal', 'dark-theme');
    
    if (randomTheme !== 'theme-default') {
        document.body.classList.add(randomTheme, 'dark-theme');
    }
}

function cycleTheme() {
    const themes = ['theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal', 'dark-theme'];
    const body = document.body;
    let current = '';
    
    themes.forEach(t => { if(body.classList.contains(t)) current = t; });
    body.classList.remove(...themes);

    if (!current) body.classList.add(themes[0]); // Default -> First Theme
    else {
        const idx = themes.indexOf(current);
        if (idx + 1 < themes.length) body.classList.add(themes[idx + 1]);
        // If at end, loop back to default (no class)
    }
}

function initStarfield() {
    var canvas = document.getElementById('canvas');
    if(!canvas) return;
    
    var ctx = canvas.getContext('2d'),
        w = canvas.width = window.innerWidth,
        h = canvas.height = window.innerHeight;

    // Get current Theme Hue
    const bodyStyle = getComputedStyle(document.body);
    const themeHue = bodyStyle.getPropertyValue('--first-color-hue').trim();
    var hue = parseInt(themeHue) || 35; 

    var stars = [], count = 0, maxStars = 400;

    var canvas2 = document.createElement('canvas'), ctx2 = canvas2.getContext('2d');
    canvas2.width = 100; canvas2.height = 100;
    var half = canvas2.width / 2, gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
    gradient2.addColorStop(0.025, 'hsla(' + hue + ', 99%, 99%, 100%)');
    gradient2.addColorStop(0.1, 'hsla(' + hue + ', 99%, 63%, 60%)');
    gradient2.addColorStop(0.25, 'hsla(' + hue + ', 64%, 55%, 0%)');
    ctx2.fillStyle = gradient2; ctx2.beginPath(); ctx2.arc(half, half, half, 0, Math.PI * 2); ctx2.fill();

    function random(min, max) { if (arguments.length < 2) { max = min; min = 0; } if (min > max) { var hold = max; max = min; min = hold; } return Math.floor(Math.random() * (max - min + 1)) + min; }
    function maxOrbit(x, y) { var max = Math.max(x, y), diameter = Math.round(Math.sqrt(max * max + max * max)); return diameter / 2; }

    var Star = function () {
        this.orbitRadius = random(maxOrbit(w, h));
        this.radius = random(60, this.orbitRadius) / 12;
        this.orbitX = w / 2; this.orbitY = h / 2;
        this.timePassed = random(0, maxStars);
        this.speed = random(this.orbitRadius) / 500000;
        this.alpha = random(2, 10) / 10;
        count++; stars[count] = this;
    }

    Star.prototype.draw = function () {
        var x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX,
            y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY,
            twinkle = random(10);

        if (twinkle === 1 && this.alpha > 0) this.alpha -= 0.05;
        else if (twinkle === 2 && this.alpha < 1) this.alpha += 0.05;

        ctx.globalAlpha = this.alpha;
        ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius);
        this.timePassed += this.speed;
    }

    if(window.starLoop) cancelAnimationFrame(window.starLoop);
    stars = []; count = 0;
    for (var i = 0; i < maxStars; i++) new Star();

    function animation() {
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 1, l = stars.length; i < l; i++) stars[i].draw();
        ctx.globalCompositeOperation = 'source-over';
        window.starLoop = requestAnimationFrame(animation);
    }

    animation();

    window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    });
}
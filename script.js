document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTS ---
    const landingView = document.getElementById('landing-view');
    const docsView = document.getElementById('docs-view');
    const projectGrid = document.getElementById('project-grid');
    const projectSelector = document.getElementById('project-selector'); // Restored
    const sidebarList = document.getElementById('section-list');
    const mainContent = document.getElementById('main-content');
    const homeBtn = document.getElementById('home-btn');
    const themeBtn = document.getElementById('theme-btn');
    const searchInput = document.getElementById('search-input');

    let allProjectsIndex = []; // Stores data.json content
    let currentProjectData = null; // Stores currently loaded project JSON

    // --- INITIALIZATION ---
    initStarfield();
    fetchProjectIndex();
    applyRandomTheme();

    // --- EVENT LISTENERS ---
    homeBtn.addEventListener('click', showLandingPage);
    
    // Dropdown Switcher Logic
    projectSelector.addEventListener('change', (e) => {
        loadProjectDocumentation(e.target.value);
    });

    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            cycleTheme();
            initStarfield();
        });
    }

    if(searchInput) {
        searchInput.addEventListener('input', (e) => filterSidebar(e.target.value.toLowerCase()));
    }

    // --- 1. FETCH INDEX (Populate Grid & Dropdown) ---
    function fetchProjectIndex() {
        fetch('data.json')
            .then(res => res.json())
            .then(projects => {
                allProjectsIndex = projects;
                renderLandingPage(projects);
                populateDropdown(projects);
            })
            .catch(err => console.error("Error loading index:", err));
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
        // Keep the first default option
        projectSelector.innerHTML = '<option value="" disabled>Switch Project...</option>';
        
        projects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.path; // Store the JSON path as value
            option.textContent = proj.title;
            projectSelector.appendChild(option);
        });
    }

    // --- 2. LOAD SPECIFIC PROJECT ---
    function loadProjectDocumentation(jsonPath) {
        // UI Feedback
        mainContent.innerHTML = '<div class="placeholder"><p>Loading Project Data...</p></div>';
        
        // Sync Dropdown (in case triggered from Landing Page)
        projectSelector.value = jsonPath;

        fetch(jsonPath)
            .then(res => res.json())
            .then(projectData => {
                currentProjectData = projectData; // Save for search context
                showDocsInterface();
                initSidebar(projectData.sections);
                
                // Clear search on new project load
                searchInput.value = ''; 
            })
            .catch(err => {
                console.error("Error loading project:", err);
                mainContent.innerHTML = `<div class="placeholder"><p>Error loading ${jsonPath}</p></div>`;
            });
    }

    function initSidebar(sectionsToRender) {
        sidebarList.innerHTML = ''; 
        
        if(!sectionsToRender || sectionsToRender.length === 0) {
            sidebarList.innerHTML = '<li class="no-results">No sections found</li>';
            return;
        }

        sectionsToRender.forEach((section, index) => {
            const li = document.createElement('li');
            li.textContent = section.title;
            
            li.addEventListener('click', () => {
                document.querySelectorAll('#section-list li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                renderContent(section);
            });

            // Auto-load first section if no search is active
            if (index === 0 && !searchInput.value) {
                li.classList.add('active');
                renderContent(section);
            }
            
            sidebarList.appendChild(li);
        });
    }

    // --- 3. SEARCH & RENDER (Same as before) ---
    function filterSidebar(query) {
        if (!currentProjectData) return;
        if (!query) {
            initSidebar(currentProjectData.sections);
            return;
        }
        const filtered = currentProjectData.sections.filter(section => {
            if (section.title.toLowerCase().includes(query)) return true;
            return section.content.some(block => 
                block.value && typeof block.value === 'string' && block.value.toLowerCase().includes(query)
            );
        });
        initSidebar(filtered);
    }

    function renderContent(section) {
        mainContent.innerHTML = '';
        const title = document.createElement('h1');
        title.className = 'doc-title';
        title.textContent = section.title;
        mainContent.appendChild(title);

        section.content.forEach(block => {
            let el;
            if (block.type === 'header') {
                el = document.createElement('h2');
                el.innerHTML = block.value;
            } else if (block.type === 'text') {
                el = document.createElement('div');
                el.className = 'text-block';
                el.innerHTML = block.value;
            } else if (block.type === 'note') {
                el = document.createElement('div');
                el.className = 'note-block';
                el.innerHTML = `<i class='bx bx-info-circle'></i> <div>${block.value}</div>`;
            } else if (block.type === 'tip') {
                el = document.createElement('div');
                el.className = 'tip-block';
                el.innerHTML = `<i class='bx bx-bulb'></i> <div>${block.value}</div>`;
            } else if (block.type === 'image') {
                const wrap = document.createElement('div');
                wrap.className = `img-wrap ${block.align}`;
                const img = document.createElement('img');
                img.src = block.src;
                wrap.appendChild(img);
                if(block.caption) {
                    const cap = document.createElement('span');
                    cap.className = 'caption';
                    cap.textContent = block.caption;
                    wrap.appendChild(cap);
                }
                el = wrap;
            }
            if (el) mainContent.appendChild(el);
        });

        const clear = document.createElement('div');
        clear.style.clear = 'both';
        mainContent.appendChild(clear);
        mainContent.scrollTop = 0;
    }

    function showDocsInterface() {
        landingView.classList.add('hidden');
        docsView.classList.remove('hidden');
    }

    function showLandingPage() {
        docsView.classList.add('hidden');
        landingView.classList.remove('hidden');
        projectSelector.value = ""; // Reset dropdown
    }
});

// --- VISUALS ---
function cycleTheme() { /* Keep existing code */ 
    const themes = ['theme-cosmic', 'theme-cyberpunk', 'theme-royal'];
    const body = document.body;
    let current = '';
    themes.forEach(t => { if(body.classList.contains(t)) current = t; });
    body.classList.remove(...themes);
    if (!current) body.classList.add(themes[0]);
    else {
        const idx = themes.indexOf(current);
        if (idx + 1 < themes.length) body.classList.add(themes[idx + 1]);
    }
}

function applyRandomTheme() {
    const themes = ['theme-default', 'theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    // Clean up old classes before adding new ones
    document.body.classList.remove('theme-cosmic', 'theme-cyberpunk', 'theme-royal', 'theme-metal', 'dark-theme');
    
    if (randomTheme !== 'theme-default') {
        document.body.classList.add(randomTheme, 'dark-theme');
    }
}


function initStarfield() { /* Keep existing code */
    var canvas = document.getElementById('canvas');
    if(!canvas) return;
    var ctx = canvas.getContext('2d'), w = canvas.width = window.innerWidth, h = canvas.height = window.innerHeight;
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
    var Star = function () { this.orbitRadius = random(maxOrbit(w, h)); this.radius = random(60, this.orbitRadius) / 12; this.orbitX = w / 2; this.orbitY = h / 2; this.timePassed = random(0, maxStars); this.speed = random(this.orbitRadius) / 500000; this.alpha = random(2, 10) / 10; count++; stars[count] = this; }
    Star.prototype.draw = function () { var x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX, y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY, twinkle = random(10); if (twinkle === 1 && this.alpha > 0) this.alpha -= 0.05; else if (twinkle === 2 && this.alpha < 1) this.alpha += 0.05; ctx.globalAlpha = this.alpha; ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius); this.timePassed += this.speed; }
    if(window.starLoop) cancelAnimationFrame(window.starLoop);
    stars = []; count = 0; for (var i = 0; i < maxStars; i++) new Star();
    function animation() { ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter'; for (var i = 1, l = stars.length; i < l; i++) stars[i].draw(); ctx.globalCompositeOperation = 'source-over'; window.starLoop = requestAnimationFrame(animation); }
    animation();
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });
}

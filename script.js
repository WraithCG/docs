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
    let allProjectsIndex = [];      
    let currentProjectData = null;  
    let flatNavigationList = [];    // Linear list for Prev/Next navigation

    // =========================================================================
    // 2. INITIALIZATION
    // =========================================================================
    initStarfield();
    applyRandomTheme();
    fetchProjectIndex();

    // =========================================================================
    // 3. EVENT LISTENERS
    // =========================================================================
    
    // Navigation
    if(homeBtn) homeBtn.addEventListener('click', showLandingPage);
    
    // Project Switcher
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
    // 4. IMAGE LAZY LOADING (Performance)
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
    }, { rootMargin: "200px" });

    // =========================================================================
    // 5. CORE LOGIC: INDEX & DATA LOADING
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
                projectGrid.innerHTML = '<p style="color:white;text-align:center;">Error loading configuration. Check console.</p>';
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

    // Recursive function to flatten the hierarchy for Linear Navigation
    function buildLinearList(sections, list = []) {
        sections.forEach(section => {
            // Assign UUID for tracking
            if (!section._uuid) section._uuid = Math.random().toString(36).substr(2, 9);
            
            list.push(section);
            
            if (section.subsections && section.subsections.length > 0) {
                buildLinearList(section.subsections, list);
            }
        });
        return list;
    }

    function loadProjectDocumentation(jsonPath) {
        mainContent.innerHTML = '<div class="placeholder"><p>Loading Project Data...</p></div>';
        if(projectSelector) projectSelector.value = jsonPath;

        fetch(jsonPath)
            .then(res => res.json())
            .then(projectData => {
                currentProjectData = projectData;
                
                // Build linear list for Next/Prev buttons
                flatNavigationList = buildLinearList(projectData.sections);
                
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
    // 6. SIDEBAR & SEARCH LOGIC (Nested)
    // =========================================================================

    function initSidebar(sectionsToRender) {
        sidebarList.innerHTML = ''; 
        
        if(!sectionsToRender || sectionsToRender.length === 0) {
            sidebarList.innerHTML = '<li class="no-results">No sections found</li>';
            return;
        }

        sectionsToRender.forEach((section, index) => {
            const li = document.createElement('li');
            li.dataset.id = section._uuid; // Bind via UUID

            // 1. Header (Title + Arrow)
            const header = document.createElement('div');
            header.className = 'sidebar-item-header';
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = section.title;
            header.appendChild(titleSpan);

            // Click Logic
            header.addEventListener('click', () => {
                highlightSidebarItem(section._uuid);
                renderContent(section);
            });

            li.appendChild(header);

            // 2. Subsections (Recursive Tree)
            if (section.subsections && section.subsections.length > 0) {
                // Arrow Icon
                const arrow = document.createElement('i');
                arrow.className = 'bx bx-chevron-right arrow-icon';
                header.appendChild(arrow);
                
                // Toggle Collapse
                arrow.addEventListener('click', (e) => { 
                    e.stopPropagation(); 
                    li.classList.toggle('open'); 
                });

                // Create Sub-list
                const subUl = document.createElement('ul');
                subUl.className = 'sidebar-sublist';

                section.subsections.forEach(sub => {
                    const subLi = document.createElement('li');
                    subLi.textContent = sub.title;
                    subLi.dataset.id = sub._uuid;
                    
                    subLi.addEventListener('click', (e) => {
                        e.stopPropagation();
                        highlightSidebarItem(sub._uuid);
                        li.classList.add('open'); // Ensure parent is open
                        renderContent(sub);
                    });
                    subUl.appendChild(subLi);
                });

                li.appendChild(subUl);
            }

            // Auto-load first item
            if (index === 0 && (!searchInput || !searchInput.value)) {
                li.classList.add('active');
                renderContent(section);
            }
            
            sidebarList.appendChild(li);
        });
    }

    function highlightSidebarItem(uuid) {
        document.querySelectorAll('#section-list li').forEach(el => el.classList.remove('active', 'sub-active'));
        
        const target = document.querySelector(`li[data-id="${uuid}"]`);
        if (target) {
            target.classList.add('active');
            if (target.parentElement.classList.contains('sidebar-sublist')) {
                target.classList.add('sub-active');
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function filterSidebar(query) {
        if (!currentProjectData) return;
        if (!query) { initSidebar(currentProjectData.sections); return; }

        let results = [];
        
        // Helper to flatten search results (Show Parent > Child title)
        const traverse = (list, parentTitle = '') => {
            list.forEach(sec => {
                if(matchesQuery(sec, query)) {
                    // Create a visual copy for search result
                    const displayTitle = parentTitle ? `${parentTitle} > ${sec.title}` : sec.title;
                    results.push({ ...sec, title: displayTitle, subsections: null }); 
                }
                if(sec.subsections) traverse(sec.subsections, sec.title);
            });
        };

        traverse(currentProjectData.sections);
        initSidebar(results);
    }

    function matchesQuery(section, query) {
        if (section.title.toLowerCase().includes(query)) return true;
        return section.content.some(block => {
            if (block.value && typeof block.value === 'string') return block.value.toLowerCase().includes(query);
            if (block.value && Array.isArray(block.value)) return block.value.join(' ').toLowerCase().includes(query);
            return false;
        });
    }

    // =========================================================================
    // 7. CONTENT RENDERING ENGINE
    // =========================================================================

    function renderContent(section) {
        mainContent.innerHTML = '';

        // 1. Page Title
        const title = document.createElement('h1');
        title.className = 'doc-title';
        title.textContent = section.title;
        mainContent.appendChild(title);

        

        // 3. Render Blocks
        if (section.content) {
            section.content.forEach(block => {
                let el;
                
                // --- HEADERS ---
                if (block.type === 'header') {
                    el = document.createElement('h2');
                    el.innerHTML = block.value;
                } 
                // --- RICH TEXT (Array support) ---
                else if (block.type === 'text') {
                    el = document.createElement('div');
                    el.className = 'text-block';
                    el.innerHTML = parseRichText(block.value);
                } 
                // --- NOTE BLOCK ---
                else if (block.type === 'note') {
                    el = document.createElement('div');
                    el.className = 'note-block';
                    el.innerHTML = `<i class='bx bx-info-circle'></i> <div>${parseRichText(block.value)}</div>`;
                }
                // --- TIP BLOCK ---
                else if (block.type === 'tip') {
                    el = document.createElement('div');
                    el.className = 'tip-block';
                    el.innerHTML = `<i class='bx bx-bulb'></i> <div>${parseRichText(block.value)}</div>`;
                }
                // --- CODE BLOCK ---
                else if (block.type === 'code') {
                    el = document.createElement('pre');
                    el.className = 'code-block';
                    const codeContent = Array.isArray(block.value) ? block.value.join('\n') : block.value;
                    el.textContent = codeContent;
                }
                // --- IMAGE BLOCK (Lazy + Zoom) ---
                else if (block.type === 'image') {
                    const wrap = document.createElement('div');
                    wrap.className = `img-wrap ${block.align}`;
                    
                    const img = document.createElement('img');
                    img.dataset.src = block.src;
                    img.className = 'lazy';
                    img.alt = block.caption || "Doc Image";
                    img.style.cursor = 'zoom-in';
                    
                    img.addEventListener('click', () => openLightbox(block.src));
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
                // --- ROADMAP BLOCK (Accordion) ---
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
                        
                        // Toggle Accordion
                        item.querySelector('.roadmap-header-group').addEventListener('click', () => {
                            item.classList.toggle('expanded');
                        });

                        container.appendChild(item);
                    });
                    el = container;
                }

                if (el) mainContent.appendChild(el);
            });
        }

        // 2. Subsection Quick Links (Grid)
        if (section.subsections && section.subsections.length > 0) {
            const subContainer = document.createElement('div');
            subContainer.className = 'subsection-grid';
            section.subsections.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'subsection-card';
                card.innerHTML = `<i class='bx bx-subdirectory-right'></i><span>${sub.title}</span>`;
                
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    highlightSidebarItem(sub._uuid);
                    renderContent(sub);
                });
                subContainer.appendChild(card);
            });
            mainContent.appendChild(subContainer);
        }

        // 4. Navigation Buttons (Global Context)
        if (!searchInput || !searchInput.value) {
            renderNavButtons(section);
        }

        const clear = document.createElement('div');
        clear.style.clear = 'both';
        mainContent.appendChild(clear);
        mainContent.scrollTop = 0;
    }

    function renderNavButtons(currentSection) {
        // Find current position in the flattened list
        const flatIndex = flatNavigationList.findIndex(item => item._uuid === currentSection._uuid);
        
        if (flatIndex === -1) return;

        const navContainer = document.createElement('div');
        navContainer.className = 'page-nav';

        // Prev Button
        if (flatIndex > 0) {
            const prevSection = flatNavigationList[flatIndex - 1];
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
                highlightSidebarItem(prevSection._uuid);
                renderContent(prevSection);
            });
            navContainer.appendChild(prevBtn);
        }

        // Next Button
        if (flatIndex < flatNavigationList.length - 1) {
            const nextSection = flatNavigationList[flatIndex + 1];
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
                highlightSidebarItem(nextSection._uuid);
                renderContent(nextSection);
            });
            navContainer.appendChild(nextBtn);
        }

        mainContent.appendChild(navContainer);
    }

    // Helper: Parse Rich Text
    function parseRichText(content) {
        if (Array.isArray(content)) return content.join('');
        return content;
    }

    // =========================================================================
    // 8. VIEW SWITCHING & UTILS
    // =========================================================================

    function showDocsInterface() {
        landingView.classList.add('hidden');
        docsView.classList.remove('hidden');
    }

    function showLandingPage() {
        docsView.classList.add('hidden');
        landingView.classList.remove('hidden');
        if(projectSelector) projectSelector.value = "";
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
// 9. VISUAL EFFECTS (Starfield & Themes)
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
    const themes = ['theme-cosmic', 'theme-cyberpunk', 'theme-royal','theme-metal','dark-theme'];
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

function initStarfield() {
    var canvas = document.getElementById('canvas');
    if(!canvas) return;
    
    var ctx = canvas.getContext('2d'),
        w = canvas.width = window.innerWidth,
        h = canvas.height = window.innerHeight;

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